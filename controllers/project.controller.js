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
    // Use department and academicYear from query parameters
    const { page = 1, limit = 10, department, academicYear, search } = req.query; 
    
    // Build query
    const query = {};
    
    // Add filters if provided using the new names
    if (department) query.department = department; 
    if (academicYear) query.academicYear = academicYear; 
    
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
    // Select only the fields needed by the frontend detail page
    const project = await Project.findById(req.params.id)
      .select('title problemStatement objectives academicYear department filePath uploadedBy') // Changed programme to department
      .populate('uploadedBy', 'name'); // Keep uploadedBy populated if needed elsewhere, or remove if not

    if (!project) {
      return response.error(res, 'Project not found', 404);
    }

    // Map to the structure/names expected by the frontend
    const projectDetails = {
      _id: project._id,
      title: project.title,
      extractedProblemStatement: project.problemStatement, // Map field name
      extractedObjectives: project.objectives,           // Map field name
      academicYear: project.academicYear,
      department: project.department, // Changed programme to department
      filePath: project.filePath, // Include filePath
      uploadedBy: project.uploadedBy // Include if needed
      // Add any other fields required by the detail view
    };

    // Return the mapped details directly in the data payload
    return response.success(
      res,
      'Project retrieved successfully',
      projectDetails // Return the mapped object directly
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct academic years
 * @route GET /api/projects/years
 * @access Public
 */
exports.getAcademicYears = async (req, res, next) => {
  try {
    const years = await Project.distinct('academicYear');
    // Ensure years are sorted, typically strings sort correctly but explicit sort is safer
    years.sort(); 
    // Send the array directly to match frontend expectation
    return res.status(200).json(years); 
  } catch (error) {
    next(error);
  }
};

/**
 * Get projects filtered by academic year
 * @route GET /api/projects/year/:year
 * @access Public
 */
exports.getProjectsByYear = async (req, res, next) => {
  try {
    const { year } = req.params;
    if (!year) {
      return response.error(res, 'Academic year parameter is required', 400);
    }

    // Build query
    const query = { academicYear: year };

    // Find projects matching the criteria
    // Select only fields needed for the project card to minimize payload
    const projects = await Project.find(query)
      .select('_id title description academicYear department tags') // Changed programme to department
      .sort({ title: 1 }); // Sort by title alphabetically

    // Send the array directly
    return res.status(200).json(projects); 
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

    let limitedText = '';

    // --- 1. Extract Limited Text ---
    try {
      if (fileType === '.docx') {
        limitedText = await fileProcessor.extractLimitedTextFromDocx(filePath);
      } else if (fileType === '.pdf') {
        limitedText = await fileProcessor.extractLimitedTextFromPdf(filePath);
      } else {
        // Clean up uploaded file if it's not supported
        await fs.unlink(filePath);
        return response.error(res, 'Unsupported file type. Please upload DOCX or PDF.', 400);
      }
    } catch (textExtractError) {
      // Handle errors from text extraction (e.g., scanned PDF rejection)
      await fs.unlink(filePath); // Clean up file
      console.error('Text extraction failed:', textExtractError.message);
      return response.error(res, textExtractError.message || 'Failed to extract text from file.', 400);
    }

    // --- 2. Local Metadata Extraction ---
    let metadata = fileProcessor.localExtractMetadata(limitedText);

    // --- 3. AI Metadata Extraction (Now always runs) ---
    let finalMetadata = { ...metadata }; // Start with local results as a base
    console.log('Attempting AI metadata extraction to refine results...');
    try {
      // Pass the limited text
      const aiMetadata = await fileProcessor.aiExtractMetadata(limitedText);

      // Merge AI results, prioritizing AI data for non-null/non-empty values
      // Overwrite local data with AI data if AI provided something meaningful
      for (const key in aiMetadata) {
        const aiValue = aiMetadata[key];
        if (aiValue !== null && aiValue !== undefined) {
           // Check for empty strings or empty arrays from AI
           if (typeof aiValue === 'string' && aiValue.trim().length > 0) {
             finalMetadata[key] = aiValue;
           } else if (Array.isArray(aiValue) && aiValue.length > 0) {
             finalMetadata[key] = aiValue;
           } else if (typeof aiValue !== 'string' && !Array.isArray(aiValue)) {
             // Handle non-string, non-array types (like year if it were number)
             finalMetadata[key] = aiValue;
           }
           // If AI returned null, empty string, or empty array, keep the local value (which might also be null/empty)
        }
      }
      console.log('Metadata after merging AI results (AI prioritized):', finalMetadata);

    } catch (aiError) {
      // Log AI error but proceed with potentially incomplete local data
      console.error('AI metadata extraction failed:', aiError);
      // Use the potentially incomplete local data stored in 'finalMetadata'
    }

    // --- 4. Validate Final Metadata ---
    const criticalFields = ['title', 'department', 'academicYear']; // Changed programme to department
    const missingCritical = criticalFields.filter(field => !finalMetadata[field]);
    if (missingCritical.length > 0) {
      await fs.unlink(filePath); // Clean up file
      console.error('Validation failed. Missing critical fields after all extraction attempts:', missingCritical.join(', '));
      return response.error(res, `Failed to extract critical information (${missingCritical.join(', ')}) from the document.`, 400);
    }

    // --- 5. Generate Embeddings ---
    let embeddings = []; // Default to empty array
    try {
      console.log('Attempting to generate embeddings for uploaded project...');
      embeddings = await fileProcessor.generateEmbeddings(finalMetadata);
      console.log('Embeddings generated successfully for uploaded project.');
    } catch (embeddingError) {
      console.error('Embedding generation failed for uploaded project:', embeddingError.message);
      // Proceeding with empty embeddings if generation fails, error is logged.
      // Consider if this should be a hard failure depending on requirements.
    }

    // --- 6. Create Project ---
    // Use the final merged metadata
    const project = await Project.create({
      title: finalMetadata.title,
      problemStatement: finalMetadata.problemStatement || '', // Default to empty string if null
      objectives: finalMetadata.objectives || [], // Default to empty array
      department: finalMetadata.department, // Changed programme to department
      academicYear: finalMetadata.academicYear,
      supervisor: finalMetadata.supervisor || null, // Allow null supervisor
      students: finalMetadata.students || [], // Default to empty array
      filePath: filePath, // Store the path to the original file
      uploadedBy: req.user.id, // Assuming auth middleware adds user to req
      embeddings: embeddings // Save the generated (or empty if failed) embeddings
    });

    return response.success(
      res,
      'Project uploaded and processed successfully',
      {
        projectId: project._id,
        extractedMetadata: finalMetadata // Return the final merged metadata
      },
      201 // Status code for resource created
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
    const projectsThisYear = await Project.countDocuments({ academicYear: currentYear }); // Ensure field name consistency
    
    // Get top departments
    const topDepartments = await Project.aggregate([ // Renamed variable for clarity
      { $group: { _id: '$department', count: { $sum: 1 } } }, // This already uses 'department', which is good.
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
        topDepartments: topDepartments, // Use renamed variable
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
 * Bulk upload projects via CSV (DEFERRED)
 * @route POST /api/projects/bulk
 * @access Private (Admin only)
 */
exports.bulkUpload = async (req, res, next) => {
  // Indicate feature is deferred
  console.warn('Bulk Upload endpoint called, but feature is currently deferred.');
  if (req.file && req.file.path) {
     try {
      await fs.unlink(req.file.path); // Clean up uploaded file immediately
      console.log(`Cleaned up deferred bulk upload file: ${req.file.path}`);
    } catch (unlinkError) {
      console.error(`Error cleaning up deferred bulk upload file ${req.file.path}:`, unlinkError);
    }
  }
  return response.error(res, 'Bulk upload feature is currently disabled.', 501); // 501 Not Implemented

  /* // Original logic commented out below
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
  */
};

/**
 * Download the project report file
 * @route GET /api/projects/:id/download
 * @access Public (or Private, depending on requirements)
 */
exports.downloadProjectReport = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).select('filePath title'); // Select filePath and title

    if (!project) {
      return response.error(res, 'Project not found', 404);
    }

    if (!project.filePath) {
      return response.error(res, 'Project file path not found', 404);
    }

    // Ensure the file path is absolute or correctly relative to the server root
    const absoluteFilePath = path.resolve(project.filePath);

    // Check if file exists before attempting download
    try {
      await fs.access(absoluteFilePath); // Check accessibility
    } catch (fileAccessError) {
      console.error(`File not accessible at path ${absoluteFilePath}:`, fileAccessError);
      return response.error(res, 'Project report file not found or inaccessible.', 404);
    }

    // Optional: Construct a user-friendly filename
    const fileExtension = path.extname(project.filePath);
    // Sanitize title for filename
    const sanitizedTitle = project.title ? project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'project';
    const downloadFilename = `${sanitizedTitle}_report${fileExtension}`;

    // Use res.download to send the file
    // It handles setting Content-Disposition header for download prompt
    res.download(absoluteFilePath, downloadFilename, (err) => {
      if (err) {
        // Handle errors that occur during the download stream
        // Check if headers were already sent
        if (!res.headersSent) {
          console.error(`Error downloading file ${absoluteFilePath}:`, err);
          // Avoid sending another response if one might have partially sent
           return next(err); // Pass error to default error handler
        } else {
           console.error(`Error occurred after headers sent for file ${absoluteFilePath}:`, err);
           // Cannot send another response, but log the error
        }
      } else {
        console.log(`Successfully sent file: ${absoluteFilePath} as ${downloadFilename}`);
      }
    });

  } catch (error) {
    next(error); // Catch errors from Project.findById or other unexpected issues
  }
};
