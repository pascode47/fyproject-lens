/**
 * Script to backfill weighted similarity scores for existing projects
 * This script calculates weighted similarity scores for all projects in the database
 * and updates their similarity results.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Project, SimilarityResult } = require('../models');
const { fileProcessor } = require('../utils');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

/**
 * Calculate weighted similarity between two projects and update similarity results
 * @param {Object} projectA - First project
 * @param {Object} projectB - Second project
 * @returns {Promise<void>}
 */
async function calculateAndUpdateSimilarity(projectA, projectB) {
  try {
    // Skip if either project is missing required metadata
    if (!projectA.title || !projectA.problemStatement || !projectA.objectives ||
        !projectB.title || !projectB.problemStatement || !projectB.objectives) {
      console.log(`Skipping comparison between ${projectA._id} and ${projectB._id} due to missing metadata`);
      return;
    }

    // Calculate embedding-based similarity if both have embeddings
    let embeddingSimilarity = 0;
    if (projectA.embeddings && projectA.embeddings.length > 0 && 
        projectB.embeddings && projectB.embeddings.length > 0) {
      embeddingSimilarity = fileProcessor.calculateCosineSimilarity(
        projectA.embeddings,
        projectB.embeddings
      );
    }
    
    // Calculate weighted metadata-based similarity
    const metadataSimilarity = fileProcessor.calculateWeightedSimilarity(
      {
        title: projectA.title,
        problemStatement: projectA.problemStatement,
        objectives: projectA.objectives,
        department: projectA.department
      },
      {
        title: projectB.title,
        problemStatement: projectB.problemStatement,
        objectives: projectB.objectives,
        department: projectB.department
      }
    );
    
    // Use the higher of the two similarity scores
    const similarity = Math.max(embeddingSimilarity, metadataSimilarity);
    const similarityPercentage = Math.round(similarity * 100);
    
    // Only update if similarity is above threshold
    if (similarityPercentage >= 20) {
      // Determine similar sections based on component similarities
      const similarSections = [];
      
      // Check title similarity
      if (projectA.title && projectB.title) {
        const titleSimilarity = fileProcessor.calculateWeightedSimilarity(
          { title: projectA.title },
          { title: projectB.title },
          { title: 1.0 } // Only consider title
        );
        if (titleSimilarity > 0.6) {
          similarSections.push('Title');
        }
      }
      
      // Check problem statement similarity
      if (projectA.problemStatement && projectB.problemStatement) {
        const psSimilarity = fileProcessor.calculateWeightedSimilarity(
          { problemStatement: projectA.problemStatement },
          { problemStatement: projectB.problemStatement },
          { problemStatement: 1.0 } // Only consider problem statement
        );
        if (psSimilarity > 0.5) {
          similarSections.push('Problem Statement');
        }
      }
      
      // Check objectives similarity
      if (projectA.objectives && projectB.objectives &&
          Array.isArray(projectA.objectives) && Array.isArray(projectB.objectives) &&
          projectA.objectives.length > 0 && projectB.objectives.length > 0) {
        const objSimilarity = fileProcessor.calculateWeightedSimilarity(
          { objectives: projectA.objectives },
          { objectives: projectB.objectives },
          { objectives: 1.0 } // Only consider objectives
        );
        if (objSimilarity > 0.4) {
          similarSections.push('Objectives');
        }
      }
      
      // Find existing similarity result or create a new one
      let similarityResult = await SimilarityResult.findOne({
        projectId: projectA._id,
        comparedProjectId: projectB._id
      });
      
      if (similarityResult) {
        // Update existing result
        similarityResult.similarityPercentage = similarityPercentage;
        similarityResult.similarSections = similarSections;
        await similarityResult.save();
        console.log(`Updated similarity result between ${projectA._id} and ${projectB._id}: ${similarityPercentage}%`);
      } else {
        // Create new result
        await SimilarityResult.create({
          projectId: projectA._id,
          comparedProjectId: projectB._id,
          projectTitle: projectB.title,
          similarityPercentage,
          year: projectB.academicYear,
          department: projectB.department,
          similarSections
        });
        console.log(`Created new similarity result between ${projectA._id} and ${projectB._id}: ${similarityPercentage}%`);
      }
    }
  } catch (error) {
    console.error(`Error calculating similarity between ${projectA._id} and ${projectB._id}:`, error);
  }
}

/**
 * Main function to backfill weighted similarity scores
 */
async function backfillWeightedSimilarity() {
  try {
    console.log('Starting weighted similarity backfill...');
    
    // Get all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects`);
    
    // Calculate similarity for each pair of projects
    let processedCount = 0;
    const totalPairs = (projects.length * (projects.length - 1)) / 2;
    
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        await calculateAndUpdateSimilarity(projects[i], projects[j]);
        processedCount++;
        
        // Log progress
        if (processedCount % 100 === 0 || processedCount === totalPairs) {
          console.log(`Processed ${processedCount}/${totalPairs} project pairs (${Math.round(processedCount / totalPairs * 100)}%)`);
        }
      }
    }
    
    console.log('Weighted similarity backfill completed successfully');
  } catch (error) {
    console.error('Error in backfillWeightedSimilarity:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the backfill function
backfillWeightedSimilarity();
