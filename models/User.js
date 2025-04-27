const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't return password by default in queries
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  programme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Programme',
    required: [true, 'Programme is required']
  },
  registrationNo: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true,
    match: [/^T\d{2}-\d{2}-\d{5}$/, 'Registration number must be in format TXX-XX-XXXXX']
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Password comparison:');
    console.log('- Candidate password length:', candidatePassword.length);
    console.log('- Stored password hash exists:', !!this.password);
    
    // Ensure both passwords exist before comparison
    if (!candidatePassword || !this.password) {
      console.log('Missing password for comparison');
      return false;
    }
    
    // Use bcrypt to compare the password
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('- Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false; // Return false on error instead of throwing
  }
};

module.exports = mongoose.model('User', UserSchema);
