const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required']
  },
  similarityPercentage: {
    type: Number,
    required: [true, 'Similarity percentage is required'],
    min: [0, 'Similarity percentage cannot be less than 0'],
    max: [100, 'Similarity percentage cannot be more than 100']
  },
  recommendations: {
    type: [String],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user and project
AnalysisSchema.index({ userId: 1, projectId: 1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);
