# Similarity Assessment Instructions

## Overview

This process will help evaluate the accuracy of our similarity checking system by comparing manual similarity assessments with the system's automated calculations.

## Step 1: Fill in the Test Proposal Template

1. Open the file: `test_proposal_template_2025-06-11T13-15-30.csv`
2. Fill in the details of your test proposal:
   - Title
   - Problem Statement
   - Objectives (separate multiple objectives with semicolons)
   - Department
   - Academic Year

## Step 2: Assess Similarity Manually

1. Open the file: `project_metadata_2025-06-11T13-15-30.csv`
2. For each project, review its metadata and compare it to your test proposal
3. Fill in the following columns:
   - **Manual Similarity Score (0-100)**: Your assessment of how similar the project is to the test proposal (0 = not similar at all, 100 = extremely similar)
   - **Similar Sections**: List which sections are similar (Title,ProblemStatement,Objectives) - separate with commas
   - **Notes**: Any additional observations or comments

## Step 3: Process the Results

Run the following command to process your manual assessments and generate an accuracy report:

```bash
node scripts/process_similarity_assessment.js data/project_metadata_2025-06-11T13-15-30.csv data/test_proposal_template_2025-06-11T13-15-30.csv
```

This will:
1. Read your test proposal data
2. Read your manual similarity assessments
3. Calculate similarity using the system's methods (embedding-based, metadata-based, and combined)
4. Compare the system's calculations with your manual assessments
5. Generate accuracy reports in both JSON and Markdown formats

## Step 4: Review the Results

The script will generate two report files in the `data` directory:
1. `similarity_accuracy_report.json` - Detailed results in JSON format
2. `similarity_accuracy_report.md` - Human-readable report with summary metrics and detailed results

These reports will help evaluate which similarity calculation method is most accurate and identify areas for improvement.
