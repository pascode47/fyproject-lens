const mongoose = require('mongoose');

const ProgrammeSchema = new mongoose.Schema({
  abbreviation: {
    type: String,
    required: [true, 'Abbreviation is required'],
    trim: true,
    unique: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    unique: true
  },
  discipline: {
    type: String,
    required: [true, 'Discipline is required'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Programme', ProgrammeSchema);
