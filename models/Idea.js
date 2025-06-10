const mongoose = require('mongoose');

const IdeaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: [
      'blockchain',
      'ai',
      'cloud',
      'cybersecurity',
      'iot',
      'ar-vr',
      'quantum',
      'devops',
      'data-science',
      'mobile',
      'web',
      'game'
    ]
  },
  difficulty: {
    type: String,
    required: [true, 'Difficulty level is required'],
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  tags: {
    type: [String],
    default: []
  },
  resources: {
    type: [{
      title: String,
      url: String,
      type: {
        type: String,
        enum: ['article', 'video', 'tutorial', 'github', 'documentation', 'other'],
        default: 'other'
      }
    }],
    default: []
  }
}, {
  timestamps: true
});

// Index for text search
IdeaSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Idea', IdeaSchema);
