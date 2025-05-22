require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Project } = require('../models');
const { fileProcessor } = require('../utils');
// No separate connectDB function, mongoose.connect will be used directly.

const backfillEmbeddings = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI not found in .env file.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for backfilling...');

    // Fetch all projects to re-process embeddings for all of them
    const allProjects = await Project.find({});

    if (allProjects.length === 0) {
      console.log('No projects found in the database.');
      return;
    }

    console.log(`Found ${allProjects.length} projects. Re-processing embeddings for all of them with the current Ollama configuration (ensure OLLAMA_MODEL is set to 'llama3' or not set in .env to default to llama3).`);
    let updatedCount = 0;
    let errorCount = 0;

    for (const project of allProjects) { // Iterate through allProjects
      try {
        console.log(`Processing project: ${project.title} (ID: ${project._id})`);
        
        // Construct metadata object for embedding generation
        const metadata = {
          title: project.title,
          problemStatement: project.problemStatement,
          objectives: project.objectives
        };

        if (!metadata.title && !metadata.problemStatement && (!metadata.objectives || metadata.objectives.length === 0)) {
          console.warn(`Skipping project ID ${project._id} due to insufficient text data (title, problem statement, objectives are all empty).`);
          continue;
        }
        
        const embeddings = await fileProcessor.generateEmbeddings(metadata);
        
        if (embeddings && embeddings.length > 0) {
          project.embeddings = embeddings;
          await project.save();
          updatedCount++;
          console.log(`Successfully generated and saved embeddings for project ID ${project._id}.`);
        } else {
          console.warn(`Embeddings generation returned empty for project ID ${project._id}. Skipping update for this project.`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing project ID ${project._id}: ${error.message}`, error.stack);
        // Continue to the next project even if one fails
      }
    }

    console.log('\n--- Backfill Summary ---');
    console.log(`Total projects processed: ${allProjects.length}`);
    console.log(`Successfully updated projects with new embeddings: ${updatedCount}`);
    console.log(`Projects with errors during embedding generation: ${errorCount}`);
    console.log(`Projects skipped due to empty embeddings result or insufficient data: ${allProjects.length - updatedCount - errorCount}`);
    
  } catch (error) {
    console.error('Failed to run backfill script:', error.message, error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
};

backfillEmbeddings();
