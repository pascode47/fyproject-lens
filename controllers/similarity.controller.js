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

    // Validate essential fields for comparison (title, problem statement, objectives)
    if (!proposalMetadata.title && !proposalMetadata.problemStatement && (!proposalMetadata.objectives || proposalMetadata.objectives.length === 0)) {
        return response.error(res, 'Could not extract sufficient information (title, problem statement, or objectives) from the proposal for comparison.', 400);
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
    // Adjust what's passed to recommendations if its input structure relied on 'title' and 'academicYear'
    // For now, let's assume generateRecommendations can handle 'projectTitle' and 'year' or we adapt it later.
    // The objects in topSimilarForRecommendations will now have projectTitle and year.
    const topSimilarForRecommendations = proposalSimilarityResults.slice(0, 3).map(p => ({
        // Re-map to the structure expected by generateRecommendations if it's different
        // Assuming generateRecommendations expects title, problemStatement, objectives, similarityPercentage
        title: p.projectTitle, // Map back for recommendation prompt
        problemStatement: p.problemStatement,
        objectives: p.objectives,
        similarityPercentage: p.similarityPercentage
    }));


    // 6. Generate recommendations
    let recommendationsList = [];
    if (topSimilarForRecommendations.length > 0) {
        recommendationsList = await recommendations.generateRecommendations(
        { // Data for the "user project" (which is the uploaded proposal)
          title: proposalMetadata.title || "Uploaded Proposal",
          problemStatement: proposalMetadata.problemStatement || "",
          objectives: proposalMetadata.objectives || []
        },
        topSimilarForRecommendations // Pass the re-mapped top N similar existing projects
      );
    } else {
        recommendationsList = ["No significantly similar projects found to base recommendations on."];
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
    
    // Get top similar projects for recommendations
    const topSimilarProjects = await Promise.all(
      similarityResults.slice(0, 3).map(async (result) => {
        const similarProject = await Project.findById(result.comparedProjectId);
        return {
          title: similarProject.title,
          problemStatement: similarProject.problemStatement,
          objectives: similarProject.objectives,
          similarityPercentage: result.similarityPercentage
        };
      })
    );
    
    // Generate recommendations
    const recommendationsList = await recommendations.generateRecommendations(
      {
        title: project.title,
        problemStatement: project.problemStatement,
        objectives: project.objectives
      },
      topSimilarProjects
    );
    
    // Create analysis record
    await Analysis.create({
      userId: req.user.id,
      projectId: project._id,
      similarityPercentage: highestSimilarity,
      recommendations: recommendationsList,
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
