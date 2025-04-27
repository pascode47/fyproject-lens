const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  problemStatement: {
    type: String,
    required: [true, 'Problem statement is required'],
    trim: true
  },
  objectives: {
    type: [String],
    required: [true, 'At least one objective is required'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one objective is required'
    }
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    trim: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  embeddings: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true
});

// Index for text search
ProjectSchema.index({ title: 'text', problemStatement: 'text' });

module.exports = mongoose.model('Project', ProjectSchema);
