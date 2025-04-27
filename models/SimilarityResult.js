const mongoose = require('mongoose');

const SimilarityResultSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Original project reference is required']
  },
  comparedProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Compared project reference is required']
  },
  projectTitle: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true
  },
  similarityPercentage: {
    type: Number,
    required: [true, 'Similarity percentage is required'],
    min: [0, 'Similarity percentage cannot be less than 0'],
    max: [100, 'Similarity percentage cannot be more than 100']
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  similarSections: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Compound index for project and compared project
SimilarityResultSchema.index({ projectId: 1, comparedProjectId: 1 }, { unique: true });

// Index for sorting by similarity percentage
SimilarityResultSchema.index({ similarityPercentage: -1 });

module.exports = mongoose.model('SimilarityResult', SimilarityResultSchema);
