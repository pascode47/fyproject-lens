const { User, Analysis } = require('../models');
const { response } = require('../utils');

/**
 * Get all users (admin only)
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
exports.getUsers = async (req, res, next) => {
  try {
    console.log('User Controller: getUsers - Request received');
    console.log('User Controller: getUsers - Query params:', req.query);
    
    const { status, role, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (status) query.status = status;
    if (role) query.role = role;
    
    // Add search if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { registrationNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('User Controller: getUsers - MongoDB query:', JSON.stringify(query));
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('User Controller: getUsers - Pagination:', { page, limit, skip });
    
    // Get users
    const users = await User.find(query)
      .select('-password')
      .populate('programme')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('User Controller: getUsers - Found users count:', users.length);
    
    if (users.length === 0) {
      console.log('User Controller: getUsers - No users found with query');
    } else {
      console.log('User Controller: getUsers - First user:', users[0].name, users[0].email);
    }
    
    // Get total count
    const total = await User.countDocuments(query);
    console.log('User Controller: getUsers - Total users count:', total);
    
    const result = response.paginate(
      res,
      'Users retrieved successfully',
      users,
      page,
      limit,
      total
    );
    
    console.log('User Controller: getUsers - Response sent');
    return result;
  } catch (error) {
    console.error('User Controller: getUsers - Error:', error);
    next(error);
  }
};

/**
 * Get a single user (admin only)
 * @route GET /api/admin/users/:id
 * @access Private (Admin only)
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('programme');
    
    if (!user) {
      return response.error(res, 'User not found', 404);
    }
    
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
 * Update user status (suspend/activate) (admin only)
 * @route PATCH /api/admin/users/:id/status
 * @access Private (Admin only)
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!status || !['active', 'suspended'].includes(status)) {
      return response.error(res, 'Invalid status. Must be "active" or "suspended"', 400);
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return response.error(res, 'User not found', 404);
    }
    
    // Prevent admin from suspending themselves
    if (user._id.toString() === req.user.id && status === 'suspended') {
      return response.error(res, 'You cannot suspend your own account', 400);
    }
    
    // Update status
    user.status = status;
    await user.save();
    
    return response.success(
      res,
      `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      { user }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (admin only)
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin only)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return response.error(res, 'User not found', 404);
    }
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return response.error(res, 'You cannot delete your own account', 400);
    }
    
    // Delete user's analyses
    await Analysis.deleteMany({ userId: user._id });
    
    // Delete user
    await user.deleteOne();
    
    return response.success(
      res,
      'User deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile (for the authenticated user)
 * @route GET /api/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('programme');
    
    return response.success(
      res,
      'Profile retrieved successfully',
      { user }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's analysis history
 * @route GET /api/profile/history
 * @access Private
 */
exports.getAnalysisHistory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    // Add date filters if provided
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get analyses
    const analyses = await Analysis.find(query)
      .populate({
        path: 'projectId',
        select: 'title department year'
      })
      .sort({ timestamp: -1 });
    
    return response.success(
      res,
      'Analysis history retrieved successfully',
      { analyses }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get system analytics (admin only)
 * @route GET /api/admin/analytics
 * @access Private (Admin only)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    
    // Get new users this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Analysis statistics
    const totalAnalyses = await Analysis.countDocuments();
    
    // Get analyses this month
    const analysesThisMonth = await Analysis.countDocuments({
      timestamp: { $gte: startOfMonth }
    });
    
    // Get similarity distribution
    const highSimilarityCount = await Analysis.countDocuments({
      similarityPercentage: { $gte: 70 }
    });
    
    const mediumSimilarityCount = await Analysis.countDocuments({
      similarityPercentage: { $gte: 40, $lt: 70 }
    });
    
    const lowSimilarityCount = await Analysis.countDocuments({
      similarityPercentage: { $lt: 40 }
    });
    
    // Get project statistics from project controller
    const { Project, SimilarityResult } = require('../models');
    
    const totalProjects = await Project.countDocuments();
    
    // Get projects this year
    const currentYear = new Date().getFullYear().toString();
    const projectsThisYear = await Project.countDocuments({ year: currentYear });
    
    // Get top departments
    const topDepartments = await Project.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: '$_id', count: 1 } }
    ]);
    
    // Get average similarity
    let averageSimilarity = 0;
    const similarityResults = await SimilarityResult.find();
    
    if (similarityResults.length > 0) {
      const totalSimilarity = similarityResults.reduce(
        (sum, result) => sum + result.similarityPercentage,
        0
      );
      averageSimilarity = Math.round(totalSimilarity / similarityResults.length);
    }
    
    return response.success(
      res,
      'System analytics retrieved successfully',
      {
        userStats: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          newUsersThisMonth
        },
        analysisStats: {
          totalAnalyses,
          analysesThisMonth,
          highSimilarityCount,
          mediumSimilarityCount,
          lowSimilarityCount
        },
        projectStats: {
          totalProjects,
          projectsThisYear,
          topDepartments,
          averageSimilarity
        }
      }
    );
  } catch (error) {
    next(error);
  }
};
