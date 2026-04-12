const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, resendOTP, refreshAccessToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);

module.exports = router;
