const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Get token from request header
const getToken = (req) => {
  // Get authorization header
  const authHeader = req.headers.authorization;
  
  // Check if header exists and starts with Bearer
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  return null;
};

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    console.log('Auth Middleware: protect - Checking auth for path:', req.originalUrl);
    console.log('Auth Middleware: protect - Headers:', JSON.stringify(req.headers));
    
    // Get token
    const token = getToken(req);
    console.log('Auth Middleware: protect - Token exists:', !!token);
    
    // Check if token exists
    if (!token) {
      console.log('Auth Middleware: protect - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware: protect - Decoded token:', decoded);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    console.log('Auth Middleware: protect - User found:', !!user);
    
    // Check if user exists
    if (!user) {
      console.log('Auth Middleware: protect - User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      console.log('Auth Middleware: protect - User is suspended');
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact an administrator.'
      });
    }
    
    console.log('Auth Middleware: protect - User authorized:', user.name, user.email, user.role);
    
    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware: protect - Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Middleware to restrict access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Auth Middleware: authorize - Checking role authorization for path:', req.originalUrl);
    console.log('Auth Middleware: authorize - Required roles:', roles);
    console.log('Auth Middleware: authorize - User role:', req.user.role);
    
    // Check if user role is included in the roles array
    if (!roles.includes(req.user.role)) {
      console.log('Auth Middleware: authorize - Access denied: Role not authorized');
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    console.log('Auth Middleware: authorize - Access granted: Role authorized');
    next();
  };
};

// Generate JWT token
exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};
