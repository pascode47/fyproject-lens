/**
 * Script to export project metadata to a CSV file
 * This will help in manually evaluating similarity between proposals and existing projects
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { Project } = require('../models');
const { createObjectCsvWriter } = require('csv-writer');

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
 * Export project metadata to CSV
 */
async function exportProjectMetadata() {
  try {
    console.log('Starting project metadata export...');
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    
    // Define output file path
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputPath = path.join(outputDir, `project_metadata_${timestamp}.csv`);
    
    // Get all projects
    const projects = await Project.find({})
      .select('_id title problemStatement objectives department academicYear')
      .lean();
    
    console.log(`Found ${projects.length} projects`);
    
    // Prepare data for CSV
    const projectsData = projects.map(project => {
      // Format objectives as a single string with semicolon separators
      const objectivesStr = Array.isArray(project.objectives) 
        ? project.objectives.join('; ') 
        : (project.objectives || '');
      
      return {
        id: project._id.toString(),
        title: project.title || '',
        problemStatement: project.problemStatement || '',
        objectives: objectivesStr,
        department: project.department || '',
        academicYear: project.academicYear || '',
        // Add empty columns for manual similarity assessment
        manualSimilarityScore: '',
        similarSections: '',
        notes: ''
      };
    });
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'id', title: 'Project ID' },
        { id: 'title', title: 'Title' },
        { id: 'problemStatement', title: 'Problem Statement' },
        { id: 'objectives', title: 'Objectives' },
        { id: 'department', title: 'Department' },
        { id: 'academicYear', title: 'Academic Year' },
        { id: 'manualSimilarityScore', title: 'Manual Similarity Score (0-100)' },
        { id: 'similarSections', title: 'Similar Sections (Title,ProblemStatement,Objectives)' },
        { id: 'notes', title: 'Notes' }
      ]
    });
    
    // Write data to CSV
    await csvWriter.writeRecords(projectsData);
    
    console.log(`Project metadata exported to ${outputPath}`);
    
    // Create a second file for the test proposal metadata
    const proposalTemplatePath = path.join(outputDir, `test_proposal_template_${timestamp}.csv`);
    
    // Create CSV writer for proposal template
    const proposalCsvWriter = createObjectCsvWriter({
      path: proposalTemplatePath,
      header: [
        { id: 'title', title: 'Title' },
        { id: 'problemStatement', title: 'Problem Statement' },
        { id: 'objectives', title: 'Objectives' },
        { id: 'department', title: 'Department' },
        { id: 'academicYear', title: 'Academic Year' }
      ]
    });
    
    // Write empty template for test proposal
    await proposalCsvWriter.writeRecords([{
      title: '',
      problemStatement: '',
      objectives: '',
      department: '',
      academicYear: ''
    }]);
    
    console.log(`Test proposal template created at ${proposalTemplatePath}`);
    
    // Create a script to process the manually filled data
    const processingScriptPath = path.join(__dirname, 'process_similarity_assessment.js');
    
    // Check if the processing script already exists
    try {
      await fs.access(processingScriptPath);
      console.log(`Processing script already exists at ${processingScriptPath}`);
    } catch (err) {
      // Create the processing script if it doesn't exist
      const processingScriptContent = `/**
 * Script to process manually assessed similarity data
 * Run this after filling in the CSV files with manual similarity assessments
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
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
 * Process manually assessed similarity data
 * @param {String} projectsFilePath - Path to the CSV file with project metadata and manual assessments
 * @param {String} proposalFilePath - Path to the CSV file with test proposal metadata
 */
async function processManualAssessment(projectsFilePath, proposalFilePath) {
  try {
    console.log('Processing manual similarity assessment...');
    
    // Read test proposal data
    const proposalData = [];
    await new Promise((resolve, reject) => {
      createReadStream(proposalFilePath)
        .pipe(csv())
        .on('data', (data) => proposalData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    if (proposalData.length === 0) {
      throw new Error('No test proposal data found');
    }
    
    const testProposal = proposalData[0];
    console.log('Test proposal:', testProposal);
    
    // Parse objectives into an array
    const proposalObjectives = testProposal.Objectives 
      ? testProposal.Objectives.split(';').map(obj => obj.trim())
      : [];
    
    // Create structured proposal metadata
    const proposalMetadata = {
      title: testProposal.Title,
      problemStatement: testProposal['Problem Statement'],
      objectives: proposalObjectives,
      department: testProposal.Department,
      academicYear: testProposal['Academic Year']
    };
    
    // Generate embeddings for the test proposal
    let proposalEmbeddings = [];
    try {
      proposalEmbeddings = await fileProcessor.generateEmbeddings(proposalMetadata);
      console.log('Generated embeddings for test proposal');
    } catch (error) {
      console.error('Error generating embeddings for test proposal:', error);
    }
    
    // Read projects data with manual assessments
    const projectsData = [];
    await new Promise((resolve, reject) => {
      createReadStream(projectsFilePath)
        .pipe(csv())
        .on('data', (data) => projectsData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(\`Found \${projectsData.length} projects with manual assessments\`);
    
    // Process each project
    const results = [];
    for (const project of projectsData) {
      // Skip projects without manual similarity scores
      if (!project['Manual Similarity Score (0-100)']) {
        continue;
      }
      
      // Parse objectives into an array
      const projectObjectives = project.Objectives 
        ? project.Objectives.split(';').map(obj => obj.trim())
        : [];
      
      // Create structured project metadata
      const projectMetadata = {
        id: project['Project ID'],
        title: project.Title,
        problemStatement: project['Problem Statement'],
        objectives: projectObjectives,
        department: project.Department,
        academicYear: project['Academic Year']
      };
      
      // Calculate embedding-based similarity if embeddings are available
      let embeddingSimilarity = 0;
      if (proposalEmbeddings.length > 0) {
        try {
          // Fetch project embeddings from database
          const { Project } = require('../models');
          const projectDoc = await Project.findById(projectMetadata.id).select('embeddings');
          
          if (projectDoc && projectDoc.embeddings && projectDoc.embeddings.length > 0) {
            embeddingSimilarity = fileProcessor.calculateCosineSimilarity(
              proposalEmbeddings,
              projectDoc.embeddings
            );
          }
        } catch (error) {
          console.error(\`Error calculating embedding similarity for project \${projectMetadata.id}:\`, error);
        }
      }
      
      // Calculate weighted metadata-based similarity
      const metadataSimilarity = fileProcessor.calculateWeightedSimilarity(
        proposalMetadata,
        {
          title: projectMetadata.title,
          problemStatement: projectMetadata.problemStatement,
          objectives: projectMetadata.objectives,
          department: projectMetadata.department
        }
      );
      
      // Use the higher of the two similarity scores
      const combinedSimilarity = Math.max(embeddingSimilarity, metadataSimilarity);
      
      // Parse manual similarity score
      const manualSimilarityScore = parseInt(project['Manual Similarity Score (0-100)'], 10) / 100;
      
      // Calculate error metrics
      const embeddingError = Math.abs(embeddingSimilarity - manualSimilarityScore);
      const metadataError = Math.abs(metadataSimilarity - manualSimilarityScore);
      const combinedError = Math.abs(combinedSimilarity - manualSimilarityScore);
      
      // Add to results
      results.push({
        projectId: projectMetadata.id,
        projectTitle: projectMetadata.title,
        manualSimilarity: manualSimilarityScore,
        embeddingSimilarity,
        metadataSimilarity,
        combinedSimilarity,
        embeddingError,
        metadataError,
        combinedError,
        similarSections: project['Similar Sections'] || '',
        notes: project.Notes || ''
      });
    }
    
    // Calculate overall metrics
    const metrics = {
      totalProjects: results.length,
      embeddingMeanError: results.reduce((sum, r) => sum + r.embeddingError, 0) / results.length,
      metadataMeanError: results.reduce((sum, r) => sum + r.metadataError, 0) / results.length,
      combinedMeanError: results.reduce((sum, r) => sum + r.combinedError, 0) / results.length,
      embeddingRMSE: Math.sqrt(results.reduce((sum, r) => sum + r.embeddingError * r.embeddingError, 0) / results.length),
      metadataRMSE: Math.sqrt(results.reduce((sum, r) => sum + r.metadataError * r.metadataError, 0) / results.length),
      combinedRMSE: Math.sqrt(results.reduce((sum, r) => sum + r.combinedError * r.combinedError, 0) / results.length)
    };
    
    // Generate report
    const reportPath = path.join(__dirname, '../data', 'similarity_accuracy_report.json');
    await fs.writeFile(
      reportPath, 
      JSON.stringify({ metrics, results }, null, 2)
    );
    
    console.log(\`Accuracy report generated at \${reportPath}\`);
    console.log('Summary metrics:');
    console.log(\`Total projects evaluated: \${metrics.totalProjects}\`);
    console.log(\`Embedding-based similarity mean error: \${(metrics.embeddingMeanError * 100).toFixed(2)}%\`);
    console.log(\`Metadata-based similarity mean error: \${(metrics.metadataMeanError * 100).toFixed(2)}%\`);
    console.log(\`Combined similarity mean error: \${(metrics.combinedMeanError * 100).toFixed(2)}%\`);
    console.log(\`Embedding-based similarity RMSE: \${(metrics.embeddingRMSE * 100).toFixed(2)}%\`);
    console.log(\`Metadata-based similarity RMSE: \${(metrics.metadataRMSE * 100).toFixed(2)}%\`);
    console.log(\`Combined similarity RMSE: \${(metrics.combinedRMSE * 100).toFixed(2)}%\`);
    
    // Generate markdown report
    const markdownReportPath = path.join(__dirname, '../data', 'similarity_accuracy_report.md');
    const markdownContent = \`# Similarity Accuracy Report

## Summary Metrics

- **Total projects evaluated**: \${metrics.totalProjects}
- **Embedding-based similarity mean error**: \${(metrics.embeddingMeanError * 100).toFixed(2)}%
- **Metadata-based similarity mean error**: \${(metrics.metadataMeanError * 100).toFixed(2)}%
- **Combined similarity mean error**: \${(metrics.combinedMeanError * 100).toFixed(2)}%
- **Embedding-based similarity RMSE**: \${(metrics.embeddingRMSE * 100).toFixed(2)}%
- **Metadata-based similarity RMSE**: \${(metrics.metadataRMSE * 100).toFixed(2)}%
- **Combined similarity RMSE**: \${(metrics.combinedRMSE * 100).toFixed(2)}%

## Detailed Results

| Project ID | Project Title | Manual Similarity | Embedding Similarity | Metadata Similarity | Combined Similarity | Embedding Error | Metadata Error | Combined Error |
|------------|---------------|-------------------|----------------------|---------------------|---------------------|-----------------|----------------|----------------|
\${results.map(r => \`| \${r.projectId} | \${r.projectTitle} | \${(r.manualSimilarity * 100).toFixed(2)}% | \${(r.embeddingSimilarity * 100).toFixed(2)}% | \${(r.metadataSimilarity * 100).toFixed(2)}% | \${(r.combinedSimilarity * 100).toFixed(2)}% | \${(r.embeddingError * 100).toFixed(2)}% | \${(r.metadataError * 100).toFixed(2)}% | \${(r.combinedError * 100).toFixed(2)}% |\`).join('\\n')}

## Conclusion

Based on the evaluation results, the \${
  metrics.embeddingMeanError < metrics.metadataMeanError && metrics.embeddingMeanError < metrics.combinedMeanError
    ? 'embedding-based'
    : metrics.metadataMeanError < metrics.combinedMeanError
      ? 'metadata-based'
      : 'combined'
} similarity approach shows the lowest mean error and appears to be the most accurate method for predicting similarity between proposals and existing projects.

## Recommendations

\${
  metrics.combinedMeanError < 0.1
    ? 'The current similarity calculation methods are performing well with relatively low error rates. Continue using the current approach.'
    : 'Consider further refinements to the similarity calculation methods to reduce error rates. This could include adjusting weights, thresholds, or exploring alternative embedding models.'
}
\`;
    
    await fs.writeFile(markdownReportPath, markdownContent);
    console.log(\`Markdown report generated at \${markdownReportPath}\`);
    
  } catch (error) {
    console.error('Error processing manual assessment:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Check if file paths are provided as command line arguments
const projectsFilePath = process.argv[2];
const proposalFilePath = process.argv[3];

if (!projectsFilePath || !proposalFilePath) {
  console.error('Usage: node process_similarity_assessment.js <projects_csv_path> <proposal_csv_path>');
  process.exit(1);
}

// Run the processing function
processManualAssessment(projectsFilePath, proposalFilePath);
`;
      
      await fs.writeFile(processingScriptPath, processingScriptContent);
      console.log(`Processing script created at ${processingScriptPath}`);
    }
    
    // Create instructions file
    const instructionsPath = path.join(outputDir, 'similarity_assessment_instructions.md');
    const instructionsContent = `# Similarity Assessment Instructions

## Overview

This process will help evaluate the accuracy of our similarity checking system by comparing manual similarity assessments with the system's automated calculations.

## Step 1: Fill in the Test Proposal Template

1. Open the file: \`${path.basename(proposalTemplatePath)}\`
2. Fill in the details of your test proposal:
   - Title
   - Problem Statement
   - Objectives (separate multiple objectives with semicolons)
   - Department
   - Academic Year

## Step 2: Assess Similarity Manually

1. Open the file: \`${path.basename(outputPath)}\`
2. For each project, review its metadata and compare it to your test proposal
3. Fill in the following columns:
   - **Manual Similarity Score (0-100)**: Your assessment of how similar the project is to the test proposal (0 = not similar at all, 100 = extremely similar)
   - **Similar Sections**: List which sections are similar (Title,ProblemStatement,Objectives) - separate with commas
   - **Notes**: Any additional observations or comments

## Step 3: Process the Results

Run the following command to process your manual assessments and generate an accuracy report:

\`\`\`bash
node scripts/process_similarity_assessment.js data/${path.basename(outputPath)} data/${path.basename(proposalTemplatePath)}
\`\`\`

This will:
1. Read your test proposal data
2. Read your manual similarity assessments
3. Calculate similarity using the system's methods (embedding-based, metadata-based, and combined)
4. Compare the system's calculations with your manual assessments
5. Generate accuracy reports in both JSON and Markdown formats

## Step 4: Review the Results

The script will generate two report files in the \`data\` directory:
1. \`similarity_accuracy_report.json\` - Detailed results in JSON format
2. \`similarity_accuracy_report.md\` - Human-readable report with summary metrics and detailed results

These reports will help evaluate which similarity calculation method is most accurate and identify areas for improvement.
`;

    await fs.writeFile(instructionsPath, instructionsContent);
    console.log(`Instructions created at ${instructionsPath}`);
    
    console.log('Project metadata export completed successfully');
  } catch (error) {
    console.error('Error exporting project metadata:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the export function
exportProjectMetadata();
