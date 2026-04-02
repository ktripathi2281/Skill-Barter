const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, browseUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/browse', protect, browseUsers);
router.get('/:id', protect, getUserById);

module.exports = router;
