const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendOTP = require('../utils/sendEmail');

// Generate access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, city } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If they exist but are not verified, resend OTP
      if (!existingUser.isVerified) {
        const otp = generateOTP();
        existingUser.otp = otp;
        existingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await existingUser.save();

        await sendOTP(email, otp);

        return res.status(200).json({
          message: 'OTP resent to your email. Please verify.',
          userId: existingUser._id,
        });
      }
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Generate OTP
    const otp = generateOTP();

    // Create new user (unverified)
    const user = await User.create({
      name,
      email,
      password,
      location: {
        type: 'Point',
        coordinates: [0, 0],
        city: city || '',
      },
      otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP email
    await sendOTP(email, otp);

    res.status(201).json({
      message: 'Registration successful! Please check your email for the OTP.',
      userId: user._id,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otp +otpExpiresAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check OTP validity
    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      location: user.location,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTP(user.email, otp);

    res.json({ message: 'New OTP sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Block unverified users
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email first',
        userId: user._id,
        needsVerification: true,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      location: user.location,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/refresh
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user and check stored refresh token matches
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Issue a new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    // Clear refresh token from DB
    await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, verifyOTP, resendOTP, refreshAccessToken, logout };
