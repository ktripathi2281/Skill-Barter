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
// @desc    Browse users with optional filters
const browseUsers = async (req, res) => {
  try {
    const { category, search, lng, lat, maxDistance } = req.query;

    let filter = { _id: { $ne: req.user._id } }; // Exclude self
    let query;

    // If location coordinates are provided, find nearby users
    if (lng && lat) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance) || 50000, // Default 50km
        },
      };
    }

    query = User.find(filter)
      .populate('skillsOffered')
      .populate('skillsWanted')
      .select('-refreshToken');

    const users = await query.limit(50);

    // If a category or search filter is provided, filter in-memory
    // (for a production app, you'd use aggregation pipelines)
    let results = users;

    if (category) {
      results = results.filter((user) =>
        user.skillsOffered.some((s) => s.category === category)
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.skillsOffered.some((s) =>
            s.name.toLowerCase().includes(searchLower)
          )
      );
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
