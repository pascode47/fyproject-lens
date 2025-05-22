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
    // Temporarily making objectives optional to allow upload even if AI fails
    // required: [true, 'At least one objective is required'], 
    // validate: {
    //   validator: function(v) {
    //     return v.length > 0;
    //   },
    //   message: 'At least one objective is required'
    // }
    default: [] // Ensure it defaults to an empty array if not provided
  },
  department: { // Changed from programme
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  academicYear: { // Replaced year
    type: String,
    required: [true, 'Academic year is required'],
    trim: true
  },
  supervisor: { // Added supervisor
    type: String,
    trim: true // Assuming supervisor is optional for now
  },
  students: { // Added students
    type: [String],
    default: [] // Assuming students might be optional or added later
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

// Index for text search - adding department and objectives
ProjectSchema.index({ title: 'text', problemStatement: 'text', department: 'text', objectives: 'text' });

module.exports = mongoose.model('Project', ProjectSchema);
