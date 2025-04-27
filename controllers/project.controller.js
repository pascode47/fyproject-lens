const { Project, SimilarityResult } = require('../models');
const { response, fileProcessor } = require('../utils');
const path = require('path'); // Ensure path is imported
const fs = require('fs').promises; // Import fs promises for file deletion

/**
 * Get all projects with pagination and filtering
 * @route GET /api/projects
 * @access Public
 */
exports.getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, department, year, search } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (department) query.department = department;
    if (year) query.year = year;
    
    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get projects
    const projects = await Project.find(query)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Project.countDocuments(query);
    
    return response.paginate(
      res,
      'Projects retrieved successfully',
      projects,
      page,
      limit,
      total
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single project
 * @route GET /api/projects/:id
 * @access Public
 */
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('uploadedBy', 'name');
    
    if (!project) {
      return response.error(res, 'Project not found', 404);
    }
    
    return response.success(
      res,
      'Project retrieved successfully',
      { project }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a new project
 * @route POST /api/projects/upload
 * @access Private
 */
exports.uploadProject = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return response.error(res, 'Please upload a file', 400);
    }
    
    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    // Extract text based on file type
    if (fileType === '.docx') {
      text = await fileProcessor.extractTextFromDocx(filePath);
    } else if (fileType === '.pdf') {
      text = await fileProcessor.extractTextFromPdf(filePath);
    } else {
      // Clean up uploaded file if it's not supported
      await fs.unlink(filePath);
      return response.error(res, 'Unsupported file type. Please upload DOCX or PDF.', 400);
    }
    
    // Extract project information
    const extractedInfo = await fileProcessor.extractProjectInfo(text);
    
    // Generate embeddings
    const embeddings = await fileProcessor.generateEmbeddings(
      `${extractedInfo.title} ${extractedInfo.problemStatement} ${extractedInfo.objectives.join(' ')}`
    );
    
    // Create project
    const project = await Project.create({
      title: extractedInfo.title,
      problemStatement: extractedInfo.problemStatement,
      objectives: extractedInfo.objectives,
      department: extractedInfo.department,
      year: extractedInfo.year,
      filePath: filePath,
      uploadedBy: req.user.id,
      embeddings: embeddings
    });
    
    return response.success(
      res,
      'Project uploaded successfully',
      { 
        projectId: project._id,
        extractedInfo
      },
      201
    );
  } catch (error) {
    // Delete uploaded file if there's an error during processing
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        console.log(`Cleaned up file: ${req.file.path}`);
      } catch (unlinkError) {
        console.error(`Error cleaning up file ${req.file.path}:`, unlinkError);
      }
    }
    next(error);
  }
};

/**
 * Get project statistics
 * @route GET /api/projects/statistics
 * @access Public
 */
exports.getStatistics = async (req, res, next) => {
  try {
    // Get total projects
    const totalProjects = await Project.countDocuments();
    
    // Get projects this year
    const currentYear = new Date().getFullYear().toString();
    const projectsThisYear = await Project.countDocuments({ year: currentYear });
    
    // Get top departments
    const departments = await Project.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: '$_id', count: 1 } }
    ]);
    
    // Get average similarity (if any similarity results exist)
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
      'Project statistics retrieved successfully',
      {
        totalProjects,
        projectsThisYear,
        topDepartments: departments,
        averageSimilarity
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activities
 * @route GET /api/projects/activities
 * @access Public
 */
exports.getRecentActivities = async (req, res, next) => {
  try {
    // Get recent projects
    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('uploadedBy', 'name');
    
    // Format activities
    const activities = recentProjects.map(project => ({
      id: project._id,
      description: `New project uploaded: "${project.title}"`,
      time: project.createdAt,
      icon: '📄',
      user: project.uploadedBy.name
    }));
    
    return response.success(
      res,
      'Recent activities retrieved successfully',
      { activities }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a project
 * @route DELETE /api/projects/:id
 * @access Private (Admin only)
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return response.error(res, 'Project not found', 404);
    }
    
    // Delete file using fs.promises
    try {
      await fs.access(project.filePath); // Check if file exists
      await fs.unlink(project.filePath);
      console.log(`Deleted project file: ${project.filePath}`);
    } catch (err) {
      // Handle case where file doesn't exist or other errors
      if (err.code !== 'ENOENT') { // ENOENT means file not found, which is okay if already deleted
        console.error(`Error deleting project file ${project.filePath}:`, err);
      } else {
        console.log(`Project file not found, skipping deletion: ${project.filePath}`);
      }
    }

    // Delete similarity results related to this project
    await SimilarityResult.deleteMany({
      $or: [
        { projectId: project._id },
        { comparedProjectId: project._id }
      ]
    });
    
    // Delete project
    await project.deleteOne();
    
    return response.success(
      res,
      'Project deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk upload projects via CSV
 * @route POST /api/projects/bulk
 * @access Private (Admin only)
 */
exports.bulkUpload = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return response.error(res, 'Please upload a CSV file', 400);
    }
    
    const filePath = req.file.path;
    
    // Process CSV file
    const projects = await fileProcessor.processCsvFile(filePath);
    
    // Validate projects
    if (projects.length === 0) {
      return response.error(res, 'CSV file contains no valid projects', 400);
    }
    
    // Create projects
    const createdProjects = [];
    
    for (const projectData of projects) {
      try {
        // Generate embeddings
        const embeddings = await fileProcessor.generateEmbeddings(
          `${projectData.title} ${projectData.problemStatement} ${projectData.objectives.join(' ')}`
        );
        
        // Create project
        const project = await Project.create({
          ...projectData,
          filePath: 'N/A', // No file for bulk uploads
          uploadedBy: req.user.id,
          embeddings: embeddings
        });
        
        createdProjects.push(project);
      } catch (error) {
        console.error('Error creating project:', error);
        // Continue with next project
      }
    }
    
    // Delete CSV file using fs.promises
    try {
      await fs.unlink(filePath);
      console.log(`Deleted CSV file: ${filePath}`);
    } catch (unlinkError) {
      console.error(`Error deleting CSV file ${filePath}:`, unlinkError);
    }

    return response.success(
      res,
      'Projects bulk uploaded successfully',
      {
        count: createdProjects.length,
        total: projects.length
      }
    );
  } catch (error) {
    // Delete uploaded CSV file if there's an error during processing
    if (req.file && req.file.path) {
       try {
        await fs.unlink(req.file.path);
        console.log(`Cleaned up CSV file: ${req.file.path}`);
      } catch (unlinkError) {
        console.error(`Error cleaning up CSV file ${req.file.path}:`, unlinkError);
      }
    }
    next(error);
  }
};
