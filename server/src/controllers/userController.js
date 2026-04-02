const User = require('../models/User');

// @route   GET /api/users/profile
// @desc    Get current user's profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('skillsOffered')
      .populate('skillsWanted');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/users/profile
// @desc    Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar, location } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (location) {
      updateData.location = {
        type: 'Point',
        coordinates: location.coordinates || [0, 0],
        city: location.city || '',
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('skillsOffered')
      .populate('skillsWanted');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/browse
// @desc    Browse users with optional filters, sorted by proximity (same city first)
const browseUsers = async (req, res) => {
  try {
    const { category, search, city } = req.query;

    let filter = { _id: { $ne: req.user._id } }; // Exclude self

    // If a specific city is selected, filter by that city
    if (city) {
      filter['location.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    const users = await User.find(filter)
      .populate('skillsOffered')
      .populate('skillsWanted')
      .select('-refreshToken')
      .limit(50);

    let results = users;

    // Filter by skill category
    if (category) {
      results = results.filter((u) =>
        u.skillsOffered.some((s) => s.category === category)
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.skillsOffered.some((s) =>
            s.name.toLowerCase().includes(searchLower)
          )
      );
    }

    // Sort: same city as current user first, then others
    if (!city) {
      const currentUser = await User.findById(req.user._id);
      const myCity = currentUser?.location?.city?.toLowerCase() || '';

      if (myCity) {
        results.sort((a, b) => {
          const aMatch = (a.location?.city?.toLowerCase() || '') === myCity ? 0 : 1;
          const bMatch = (b.location?.city?.toLowerCase() || '') === myCity ? 0 : 1;
          return aMatch - bMatch;
        });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/:id
// @desc    Get a specific user's public profile
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('skillsOffered')
      .populate('skillsWanted')
      .select('-refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile, browseUsers, getUserById };
