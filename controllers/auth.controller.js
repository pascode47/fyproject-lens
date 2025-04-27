const { User, Programme } = require('../models');
const { auth } = require('../middleware');
const { response } = require('../utils');

/**
 * Register a new user
 * @route POST /api/auth/signup
 * @access Public
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, registrationNo, programme } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.error(res, 'Email already in use', 400);
    }
    
    // Check if registration number already exists
    const existingRegNo = await User.findOne({ registrationNo });
    if (existingRegNo) {
      return response.error(res, 'Registration number already in use', 400);
    }
    
    // Check if programme exists
    const programmeDoc = await Programme.findOne({ abbreviation: programme });
    if (!programmeDoc) {
      return response.error(res, 'Programme not found', 404);
    }
    
    // Use the programme's ID for the user creation
    const programmeId = programmeDoc._id;
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      registrationNo,
      programme: programmeId,
      role: 'user', // Default role
      status: 'active' // Default status
    });
    
    // Generate token
    const token = auth.generateToken(user);
    
    // Remove password from response
    user.password = undefined;
    
    return response.success(
      res,
      'User registered successfully',
      { token, user },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    console.log('Login attempt received');
    let { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      console.log('Email or password missing');
      return response.error(res, 'Please provide email and password', 400);
    }
    
    // Normalize email (lowercase and trim)
    email = email.toLowerCase().trim();
    // Trim password
    password = password.trim();
    
    console.log(`Attempting login with email: ${email}`);
    
    // Find user by email (case insensitive) and include password
    const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } }).select('+password');
    
    // Check if user exists
    if (!user) {
      console.log(`User with email ${email} not found`);
      return response.error(res, 'Invalid email or password', 401);
    }
    
    console.log(`User found: ${user.email}`);
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      console.log(`User ${user.email} is suspended`);
      return response.error(res, 'Your account has been suspended. Please contact an administrator.', 403);
    }
    
    // Check if password matches
    console.log('Comparing passwords...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Password mismatch for user ${user.email}`);
      return response.error(res, 'Invalid email or password', 401);
    }
    
    console.log(`Password match successful for user ${user.email}`);
    
    // Generate token
    const token = auth.generateToken(user);
    
    // Remove password from response
    user.password = undefined;
    
    console.log(`Login successful for user ${user.email}`);
    
    return response.success(
      res,
      'Login successful',
      { token, user }
    );
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    // Get user with programme populated
    const user = await User.findById(req.user.id).populate('programme');
    
    return response.success(
      res,
      'User retrieved successfully',
      { user }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @route PATCH /api/auth/password
 * @access Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Check if passwords are provided
    if (!currentPassword || !newPassword) {
      return response.error(res, 'Please provide current and new password', 400);
    }
    
    // Find user by id and include password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return response.error(res, 'Current password is incorrect', 401);
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    return response.success(
      res,
      'Password changed successfully'
    );
  } catch (error) {
    next(error);
  }
};
