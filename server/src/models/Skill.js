const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Programming',
        'Design',
        'Music',
        'Language',
        'Cooking',
        'Fitness',
        'Photography',
        'Writing',
        'Marketing',
        'Finance',
        'Other',
      ],
    },
    proficiencyLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['offered', 'wanted'],
      required: [true, 'Skill type (offered/wanted) is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by category and type
skillSchema.index({ category: 1, type: 1 });
skillSchema.index({ owner: 1 });

module.exports = mongoose.model('Skill', skillSchema);
