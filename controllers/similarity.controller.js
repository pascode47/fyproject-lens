const { Project, SimilarityResult, Analysis } = require('../models');
const { response, fileProcessor, recommendations } = require('../utils');
const path = require('path'); // For file type extraction
const fs = require('fs').promises; // For deleting temporary file

/**
 * Get similarity results for a project
 * @route GET /api/similarity/:projectId
 * @access Private
 */
exports.getSimilarityResults = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return response.error(res, 'Project not found', 404);
    }
    
    // Get similarity results
    const results = await SimilarityResult.find({ projectId })
      .sort({ similarityPercentage: -1 });
    
    return response.success(
      res,
      'Similarity results retrieved successfully',
      {
        projectTitle: project.title,
        results
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Check similarity of an uploaded proposal against existing projects
 * @route POST /api/similarity/check-proposal
 * @access Private (or Public, depending on auth requirements for this feature)
 */
exports.checkProposalSimilarity = async (req, res, next) => {
  let tempFilePath = null; // To store path for cleanup
  try {
    if (!req.file) {
      return response.error(res, 'Please upload a proposal file (DOCX or PDF).', 400);
    }
    tempFilePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    // 1. Extract text from the uploaded proposal
    let limitedText = '';
    try {
      if (fileType === '.docx') {
        limitedText = await fileProcessor.extractLimitedTextFromDocx(tempFilePath);
      } else if (fileType === '.pdf') {
        limitedText = await fileProcessor.extractLimitedTextFromPdf(tempFilePath);
      } else {
        // This case should ideally be caught by multer's fileFilter, but as a safeguard:
        return response.error(res, 'Unsupported file type. Please upload DOCX or PDF.', 400);
      }
      console.log('--- Extracted Limited Text (first 500 chars) ---');
      console.log(limitedText.substring(0, 500));
      console.log('--- End of Extracted Limited Text Sample ---');
    } catch (textExtractError) {
      console.error('Proposal text extraction failed:', textExtractError.message);
      return response.error(res, textExtractError.message || 'Failed to extract text from proposal file.', 400);
    }

    // 2. Extract metadata from the proposal text
    let proposalMetadata = fileProcessor.localExtractMetadata(limitedText);
    try {
      const aiProposalMetadata = await fileProcessor.aiExtractMetadata(limitedText);
      // Merge AI results, prioritizing AI data
      for (const key in aiProposalMetadata) {
        const aiValue = aiProposalMetadata[key];
        if (aiValue !== null && aiValue !== undefined) {
           if (typeof aiValue === 'string' && aiValue.trim().length > 0) {
            proposalMetadata[key] = aiValue;
           } else if (Array.isArray(aiValue) && aiValue.length > 0) {
            proposalMetadata[key] = aiValue;
           } else if (typeof aiValue !== 'string' && !Array.isArray(aiValue)) {
            proposalMetadata[key] = aiValue;
           }
        }
      }
    } catch (aiError) {
      console.error('Proposal AI metadata extraction failed:', aiError.message);
      // Continue with potentially incomplete local data
    }

    // Validate essential fields for comparison using the new validation function
    const validationResult = fileProcessor.validateMetadata(proposalMetadata);
    if (!validationResult.isValid) {
        return response.error(
            res, 
            `The uploaded document is missing required information: ${validationResult.missingFields.join(', ')}. Please ensure your proposal includes these sections and try again.`, 
            422 // Unprocessable Entity - the file was valid but the content doesn't meet requirements
        );
    }
    
    // 3. Generate temporary embeddings for the proposal
    let proposalEmbeddings = [];
    try {
      proposalEmbeddings = await fileProcessor.generateEmbeddings(proposalMetadata);
    } catch (embeddingError) {
      console.error('Proposal embedding generation failed:', embeddingError.message);
      return response.error(res, 'Failed to generate embeddings for the proposal.', 500);
    }

    if (!proposalEmbeddings || proposalEmbeddings.length === 0) {
      return response.error(res, 'Embeddings could not be generated for the proposal content.', 500);
    }

    // 4. Fetch all existing projects with embeddings
    const existingProjects = await Project.find({ embeddings: { $exists: true, $ne: [] } });
    if (existingProjects.length === 0) {
      return response.success(res, 'No existing projects with embeddings available for comparison.', { similarProjects: [], recommendations: ['No existing projects to compare against.'] });
    }

    // 5. Calculate similarity with each existing project
    const proposalSimilarityResults = [];
    for (const existingProject of existingProjects) {
      const similarity = fileProcessor.calculateCosineSimilarity(
        proposalEmbeddings,
        existingProject.embeddings
      );
      const similarityPercentage = Math.round(similarity * 100);

      if (similarityPercentage >= 10) { // Lower threshold for just showing matches
        proposalSimilarityResults.push({
          // Ensure this structure matches the frontend SimilarityResult interface
          projectId: existingProject._id,
          projectTitle: existingProject.title, // Changed 'title' to 'projectTitle'
          department: existingProject.department,
          year: existingProject.academicYear,   // Changed 'academicYear' to 'year'
          similarityPercentage: similarityPercentage,
          similarSections: [], // Add similarSections, even if empty for now, to match interface
          // For recommendations, we still need the original fields if they differ
          // So, we might need to adjust what's passed to generateRecommendations or ensure it uses these new names
          // For now, focusing on matching SimilarityResult for display
          problemStatement: existingProject.problemStatement, // Keep for recommendation context
          objectives: existingProject.objectives       // Keep for recommendation context
        });
      }
    }

    // Sort results by similarity percentage
    proposalSimilarityResults.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
    
    const topSimilarForDisplay = proposalSimilarityResults.slice(0, 2); // Changed to display top 2
    
    // 6. Fetch complete project data for the top similar projects
    const topSimilarProjectIds = proposalSimilarityResults.slice(0, 3).map(p => p.projectId);
    let topSimilarProjectsComplete = [];
    
    if (topSimilarProjectIds.length > 0) {
      // Fetch complete project data for each similar project
      topSimilarProjectsComplete = await Promise.all(
        topSimilarProjectIds.map(async (projectId) => {
          const project = await Project.findById(projectId);
          if (!project) return null;
          
          // Find the similarity percentage from our results
          const similarityResult = proposalSimilarityResults.find(p => p.projectId.toString() === projectId.toString());
          const similarityPercentage = similarityResult ? similarityResult.similarityPercentage : 0;
          
          return {
            title: project.title,
            problemStatement: project.problemStatement || "",
            objectives: project.objectives || [],
            department: project.department || "",
            academicYear: project.academicYear || "",
            similarityPercentage: similarityPercentage
          };
        })
      );
      
      // Filter out any null results (in case a project wasn't found)
      topSimilarProjectsComplete = topSimilarProjectsComplete.filter(p => p !== null);
    }

    // 7. Generate recommendations
    let recommendationsList = [];
    if (topSimilarProjectsComplete.length > 0) {
        recommendationsList = await recommendations.generateRecommendations(
        { // Data for the "user project" (which is the uploaded proposal)
          title: proposalMetadata.title || "Uploaded Proposal",
          problemStatement: proposalMetadata.problemStatement || "",
          objectives: proposalMetadata.objectives || [],
          department: proposalMetadata.department || ""
        },
        topSimilarProjectsComplete // Pass the complete project data
      );
    } else {
        recommendationsList = ["No significantly similar projects found to base recommendations on."];
    }
    
    // 8. Store the analysis results if user is authenticated
    if (req.user && req.user.id) {
      try {
        // Calculate highest similarity percentage
        const highestSimilarity = proposalSimilarityResults.length > 0 
          ? proposalSimilarityResults[0].similarityPercentage 
          : 0;
        
        // Create analysis record
        await Analysis.create({
          userId: req.user.id,
          proposalDetails: proposalMetadata,
          similarProjects: topSimilarForDisplay,
          similarityPercentage: highestSimilarity,
          recommendations: recommendationsList,
          analysisType: 'proposal',
          timestamp: new Date()
        });
        
        console.log(`Stored proposal check analysis for user ${req.user.id}`);
      } catch (analysisError) {
        console.error('Error storing proposal check analysis:', analysisError);
        // Continue with the response even if storing fails
      }
    }
    
    return response.success(
      res,
      'Proposal similarity check completed successfully',
      {
        proposalDetails: proposalMetadata, // Show what was extracted from proposal
        similarProjects: topSimilarForDisplay,
        recommendations: recommendationsList
      }
    );

  } catch (error) {
    console.error('Error in checkProposalSimilarity:', error.message, error.stack);
    next(error); // Pass to global error handler
  } finally {
    // 7. Clean up the temporary uploaded file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`Temporary proposal file deleted: ${tempFilePath}`);
      } catch (unlinkError) {
        console.error(`Error deleting temporary proposal file ${tempFilePath}:`, unlinkError.message);
      }
    }
  }
};

/**
 * Analyze a project for similarities
 * @route POST /api/similarity/analyze
 * @access Private
 */
exports.analyzeSimilarity = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    
    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return response.error(res, 'Project not found', 404);
    }
    
    // Check if project has embeddings
    if (!project.embeddings || project.embeddings.length === 0) {
      return response.error(res, 'Project has no embeddings for similarity analysis', 400);
    }
    
    // Get all other projects
    const otherProjects = await Project.find({ _id: { $ne: projectId } });
    
    // Calculate similarity with each project
    const similarityResults = [];
    let highestSimilarity = 0;
    
    for (const otherProject of otherProjects) {
      // Skip projects without embeddings
      if (!otherProject.embeddings || otherProject.embeddings.length === 0) {
        continue;
      }
      
      // Calculate similarity
      const similarity = fileProcessor.calculateCosineSimilarity(
        project.embeddings,
        otherProject.embeddings
      );
      
      // Convert to percentage
      const similarityPercentage = Math.round(similarity * 100);
      
      // Track highest similarity
      if (similarityPercentage > highestSimilarity) {
        highestSimilarity = similarityPercentage;
      }
      
      // Only store results with similarity above threshold (e.g., 20%)
      if (similarityPercentage >= 20) {
        // Determine similar sections (simplified approach)
        const similarSections = [];
        
        if (similarity > 0.7) {
          similarSections.push('Problem Statement');
        }
        
        if (similarity > 0.5) {
          similarSections.push('Objectives');
        }
        
        if (similarity > 0.3) {
          similarSections.push('Methodology');
        }
        
        // Create or update similarity result
        const existingResult = await SimilarityResult.findOne({
          projectId: project._id,
          comparedProjectId: otherProject._id
        });
        
        if (existingResult) {
          existingResult.similarityPercentage = similarityPercentage;
          existingResult.similarSections = similarSections;
          await existingResult.save();
          
          similarityResults.push(existingResult);
        } else {
          const newResult = await SimilarityResult.create({
            projectId: project._id,
            comparedProjectId: otherProject._id,
            projectTitle: otherProject.title,
            similarityPercentage,
            year: otherProject.year,
            department: otherProject.department,
            similarSections
          });
          
          similarityResults.push(newResult);
        }
      }
    }
    
    // Sort results by similarity percentage
    similarityResults.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
    
    // Get top similar projects for recommendations with complete data
    const topSimilarProjects = await Promise.all(
      similarityResults.slice(0, 3).map(async (result) => {
        const similarProject = await Project.findById(result.comparedProjectId);
        if (!similarProject) return null;
        
        return {
          title: similarProject.title,
          problemStatement: similarProject.problemStatement || "",
          objectives: similarProject.objectives || [],
          department: similarProject.department || "",
          academicYear: similarProject.academicYear || "",
          similarityPercentage: result.similarityPercentage
        };
      })
    );
    
    // Filter out any null results (in case a project wasn't found)
    const filteredTopSimilarProjects = topSimilarProjects.filter(p => p !== null);
    
    // Generate recommendations with more complete data
    const recommendationsList = await recommendations.generateRecommendations(
      {
        title: project.title,
        problemStatement: project.problemStatement || "",
        objectives: project.objectives || [],
        department: project.department || ""
      },
      filteredTopSimilarProjects
    );
    
    // Create analysis record
    await Analysis.create({
      userId: req.user.id,
      projectId: project._id,
      similarityPercentage: highestSimilarity,
      recommendations: recommendationsList,
      analysisType: 'project', // Explicitly set the analysis type
      timestamp: new Date()
    });
    
    return response.success(
      res,
      'Similarity analysis completed successfully',
      {
        similarityResults: similarityResults.slice(0, 10), // Return top 10 results
        recommendations: recommendationsList
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommendations for a project
 * @route GET /api/similarity/recommend/:projectId
 * @access Private
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return response.error(res, 'Project not found', 404);
    }
    
    // Get latest analysis for this project
    const analysis = await Analysis.findOne({ projectId })
      .sort({ timestamp: -1 });
    
    if (!analysis) {
      return response.error(res, 'No analysis found for this project', 404);
    }
    
    return response.success(
      res,
      'Recommendations retrieved successfully',
      { recommendations: analysis.recommendations }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's similarity history (both project analyses and proposal checks)
 * @route GET /api/similarity/history
 * @access Private
 */
exports.getUserSimilarityHistory = async (req, res, next) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return response.error(res, 'Authentication required', 401);
    }
    
    // Get query parameters for filtering
    const { startDate, endDate, type } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Add type filter if provided
    if (type && ['project', 'proposal'].includes(type)) {
      query.analysisType = type;
    }
    
    // Get analyses sorted by timestamp (newest first)
    const analyses = await Analysis.find(query)
      .sort({ timestamp: -1 })
      .populate('projectId', 'title department academicYear') // Populate project details if available
      .limit(50); // Limit to 50 most recent analyses
    
    // Format response
    const formattedAnalyses = analyses.map(analysis => {
      const result = {
        id: analysis._id,
        timestamp: analysis.timestamp,
        similarityPercentage: analysis.similarityPercentage,
        recommendations: analysis.recommendations,
        analysisType: analysis.analysisType
      };
      
      // Add project details if this is a project analysis
      if (analysis.analysisType === 'project' && analysis.projectId) {
        result.project = {
          id: analysis.projectId._id,
          title: analysis.projectId.title,
          department: analysis.projectId.department,
          academicYear: analysis.projectId.academicYear
        };
      }
      
      // Add proposal details if this is a proposal check
      if (analysis.analysisType === 'proposal' && analysis.proposalDetails) {
        result.proposalDetails = analysis.proposalDetails;
        result.similarProjects = analysis.similarProjects;
      }
      
      return result;
    });
    
    return response.success(
      res,
      'Similarity history retrieved successfully',
      { history: formattedAnalyses }
    );
  } catch (error) {
    next(error);
  }
};
