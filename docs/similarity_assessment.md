# Similarity Assessment Process

This document outlines the process for evaluating the accuracy of the similarity checking system in FYProjectLens. The system compares uploaded proposals to existing projects to identify potential similarities, and this assessment helps determine how well the system is performing.

## Overview

The similarity assessment process involves:

1. Exporting metadata from all existing projects in the database
2. Manually assessing the similarity between a test proposal and each project
3. Processing the manual assessments to compare with the system's automated calculations
4. Generating a comprehensive accuracy report

## Scripts

Two main scripts facilitate this process:

1. `export_project_metadata.js` - Exports project metadata to CSV files
2. `process_similarity_assessment.js` - Processes manual assessments and generates accuracy reports

## Step 1: Export Project Metadata

Run the following command to export project metadata:

```bash
npm run export-metadata
```

This script will:
- Connect to the MongoDB database
- Retrieve metadata for all projects (title, problem statement, objectives, etc.)
- Export this data to a CSV file in the `data` directory
- Create a template CSV file for your test proposal
- Create an instructions file with detailed steps

The script generates three files:
1. `project_metadata_[timestamp].csv` - Contains metadata for all projects
2. `test_proposal_template_[timestamp].csv` - Template for your test proposal
3. `similarity_assessment_instructions.md` - Detailed instructions

## Step 2: Prepare Your Test Proposal

Fill in the test proposal template CSV with the details of a proposal you want to evaluate:
- Title
- Problem Statement
- Objectives (separate multiple objectives with semicolons)
- Department
- Academic Year

## Step 3: Manually Assess Similarity

Open the project metadata CSV and for each project:
1. Review its metadata and compare it to your test proposal
2. Fill in the following columns:
   - **Manual Similarity Score (0-100)**: Your assessment of similarity (0 = not similar at all, 100 = extremely similar)
   - **Similar Sections**: List which sections are similar (Title,ProblemStatement,Objectives)
   - **Notes**: Any additional observations

## Step 4: Process the Results

Run the processing script with the paths to your filled CSV files:

```bash
node scripts/process_similarity_assessment.js data/project_metadata_[timestamp].csv data/test_proposal_template_[timestamp].csv
```

This script will:
1. Read your test proposal data
2. Read your manual similarity assessments
3. Calculate similarity using the system's methods:
   - Embedding-based similarity (using vector embeddings)
   - Metadata-based similarity (using weighted text comparison)
   - Combined similarity (the higher of the two)
4. Compare the system's calculations with your manual assessments
5. Generate accuracy reports

## Step 5: Review the Results

The script generates two report files in the `data` directory:
1. `similarity_accuracy_report.json` - Detailed results in JSON format
2. `similarity_accuracy_report.md` - Human-readable report with:
   - Summary metrics (mean error, RMSE)
   - Detailed results for each project
   - Conclusion about which similarity method performs best
   - Recommendations for improvement

## Metrics Explained

The accuracy report includes several metrics:

- **Mean Error**: The average absolute difference between manual and automated similarity scores
- **Root Mean Square Error (RMSE)**: A measure that gives higher weight to larger errors
- **Per-project errors**: Individual differences between manual and automated scores

Lower values indicate better accuracy.

## Using the Results

The accuracy assessment helps:
1. Determine which similarity calculation method is most accurate
2. Identify areas where the system may need improvement
3. Adjust thresholds for flagging concerning similarity
4. Fine-tune weights for different metadata components

## Periodic Reassessment

It's recommended to repeat this assessment periodically as:
- More projects are added to the database
- The system's similarity algorithms are updated
- New features are added to the proposal checking system

This ensures the system maintains high accuracy over time.
