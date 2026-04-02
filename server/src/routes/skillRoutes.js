const express = require('express');
const router = express.Router();
const { createSkill, getSkills, getMySkills, deleteSkill } = require('../controllers/skillController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createSkill);
router.get('/', protect, getSkills);
router.get('/my', protect, getMySkills);
router.delete('/:id', protect, deleteSkill);

module.exports = router;
