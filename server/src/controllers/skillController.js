const Skill = require('../models/Skill');
const User = require('../models/User');

// @route   POST /api/skills
// @desc    Create a new skill (offered or wanted)
const createSkill = async (req, res) => {
  try {
    const { name, description, category, proficiencyLevel, type } = req.body;

    const skill = await Skill.create({
      name,
      description,
      category,
      proficiencyLevel,
      type,
      owner: req.user._id,
    });

    // Add the skill to the user's profile
    if (type === 'offered') {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { skillsOffered: skill._id },
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { skillsWanted: skill._id },
      });
    }

    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/skills
// @desc    Get all skills with optional filters
const getSkills = async (req, res) => {
  try {
    const { category, type, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const skills = await Skill.find(filter)
      .populate('owner', 'name email avatar location')
      .sort({ createdAt: -1 });

    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/skills/my
// @desc    Get current user's skills
const getMySkills = async (req, res) => {
  try {
    const skills = await Skill.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/skills/:id
// @desc    Delete a skill
const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Only the owner can delete their skill
    if (skill.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this skill' });
    }

    // Remove skill reference from user
    const updateField =
      skill.type === 'offered'
        ? { $pull: { skillsOffered: skill._id } }
        : { $pull: { skillsWanted: skill._id } };

    await User.findByIdAndUpdate(req.user._id, updateField);
    await Skill.findByIdAndDelete(req.params.id);

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSkill, getSkills, getMySkills, deleteSkill };
