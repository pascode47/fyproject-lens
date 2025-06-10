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
    // Not required for proposal checks
    required: false
  },
  // For proposal checks (when no projectId is available)
  proposalDetails: {
    title: String,
    problemStatement: String,
    objectives: [String],
    supervisor: String,
    students: [String],
    academicYear: String,
    department: String
  },
  // Store similar projects for proposal checks
  similarProjects: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectTitle: String,
    department: String,
    year: String,
    similarityPercentage: Number,
    similarSections: [String]
  }],
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
  // Type of analysis: 'project' or 'proposal'
  analysisType: {
    type: String,
    enum: ['project', 'proposal'],
    default: 'project'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user and project (when project exists)
AnalysisSchema.index({ userId: 1, projectId: 1 });
// Index for user and timestamp for efficient history retrieval
AnalysisSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);
