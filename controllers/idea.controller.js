const { Idea } = require('../models');
const { response } = require('../utils');

/**
 * Get all ideas with optional filtering
 * @route GET /api/ideas
 * @access Public
 */
exports.getIdeas = async (req, res, next) => {
  try {
    const { limit = 10, category, difficulty, search } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    
    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }
    
    // Get ideas
    const ideas = await Idea.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    return response.success(
      res,
      'Ideas retrieved successfully',
      { ideas }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get ideas by category
 * @route GET /api/ideas/:category
 * @access Public
 */
exports.getIdeasByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { difficulty, limit = 10 } = req.query;
    
    // Build query
    const query = { category };
    
    // Add difficulty filter if provided
    if (difficulty) query.difficulty = difficulty;
    
    // Get ideas
    const ideas = await Idea.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    return response.success(
      res,
      `Ideas for ${category} retrieved successfully`,
      { ideas }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get random ideas
 * @route GET /api/ideas/random
 * @access Public
 */
exports.getRandomIdeas = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get random ideas using aggregation
    const ideas = await Idea.aggregate([
      { $sample: { size: parseInt(limit) } }
    ]);
    
    return response.success(
      res,
      'Random ideas retrieved successfully',
      { ideas }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available categories
 * @route GET /api/ideas/categories
 * @access Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    // Get distinct categories
    const categories = await Idea.distinct('category');
    
    return response.success(
      res,
      'Categories retrieved successfully',
      { categories }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new idea (admin only)
 * @route POST /api/ideas
 * @access Private (Admin only)
 */
exports.createIdea = async (req, res, next) => {
  try {
    const { title, description, category, difficulty, tags, resources } = req.body;
    
    // Create idea
    const idea = await Idea.create({
      title,
      description,
      category,
      difficulty,
      tags: tags || [],
      resources: resources || []
    });
    
    return response.success(
      res,
      'Idea created successfully',
      { idea },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update an idea (admin only)
 * @route PUT /api/ideas/:id
 * @access Private (Admin only)
 */
exports.updateIdea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty, tags, resources } = req.body;
    
    // Find idea
    const idea = await Idea.findById(id);
    
    if (!idea) {
      return response.error(res, 'Idea not found', 404);
    }
    
    // Update idea
    idea.title = title || idea.title;
    idea.description = description || idea.description;
    idea.category = category || idea.category;
    idea.difficulty = difficulty || idea.difficulty;
    idea.tags = tags || idea.tags;
    idea.resources = resources || idea.resources;
    
    await idea.save();
    
    return response.success(
      res,
      'Idea updated successfully',
      { idea }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an idea (admin only)
 * @route DELETE /api/ideas/:id
 * @access Private (Admin only)
 */
exports.deleteIdea = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find and delete idea
    const idea = await Idea.findByIdAndDelete(id);
    
    if (!idea) {
      return response.error(res, 'Idea not found', 404);
    }
    
    return response.success(
      res,
      'Idea deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};
