const { Project, SimilarityResult, Analysis } = require('../models');
const { response, fileProcessor, recommendations } = require('../utils');

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
