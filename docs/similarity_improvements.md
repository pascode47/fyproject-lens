# Similarity Checking System Improvements

This document outlines the improvements made to the similarity checking system in the FYProjectLens application. These enhancements aim to improve the accuracy, reliability, and usefulness of the similarity checking feature.

## Overview of Changes

1. **Enhanced Text Preprocessing**
   - Added sophisticated text preprocessing before embedding generation
   - Implemented stopword removal for more meaningful comparisons
   - Added text normalization (lowercase, whitespace normalization)
   - Improved handling of academic terminology

2. **Weighted Similarity Calculation**
   - Implemented a new weighted similarity calculation method as an alternative to pure embedding-based similarity
   - Different components (title, problem statement, objectives, department) are weighted differently
   - The system now uses the higher score between embedding-based and weighted similarity

3. **Improved Similar Sections Detection**
   - Added more granular detection of which sections are similar between projects
   - Each section (title, problem statement, objectives) is compared individually
   - Provides more specific feedback to users about where similarities exist

4. **Enhanced Recommendation Generation**
   - Improved the prompt for the LLM to generate more specific, actionable recommendations
   - Better parsing of LLM responses to extract structured recommendations
   - Added fallback mechanisms for when the LLM fails to generate recommendations

5. **Backfill Script for Existing Projects**
   - Created a script to backfill weighted similarity scores for existing projects
   - Ensures all projects in the database have both embedding-based and weighted similarity scores

## Technical Details

### Text Preprocessing

The text preprocessing pipeline now includes:

```javascript
const preprocessTextForEmbedding = (text) => {
  if (!text) return '';
  
  // Convert to lowercase
  let processed = text.toLowerCase();
  
  // Remove extra whitespace
  processed = processed.replace(/\s+/g, ' ').trim();
  
  // Remove special characters but keep important punctuation
  processed = processed.replace(/[^\w\s.,;:?!-]/g, '');
  
  // Remove common academic filler words that don't add meaning
  const fillerWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    // ... more stopwords ...
  ];
  
  // Only remove whole words (not parts of words)
  const words = processed.split(' ');
  const filteredWords = words.filter(word => !fillerWords.includes(word));
  
  // Join back with spaces
  return filteredWords.join(' ');
};
```

### Weighted Similarity Calculation

The weighted similarity calculation considers different components of the projects:

- Title: 15% weight
- Problem Statement: 40% weight
- Objectives: 35% weight
- Department: 10% weight

For each component, a specific similarity calculation method is used:

- Title: Word overlap similarity
- Problem Statement: TF-IDF inspired approach
- Objectives: Pairwise similarity between objectives
- Department: Exact match (1 if same, 0 if different)

### Similar Sections Detection

The system now detects which specific sections are similar between projects:

- Title: Considered similar if similarity > 0.6
- Problem Statement: Considered similar if similarity > 0.5
- Objectives: Considered similar if similarity > 0.4

### Recommendation Generation

The recommendation generation prompt has been enhanced to provide more structured guidance to the LLM:

```
# ANALYSIS APPROACH:
1. SIMILARITIES ANALYSIS: Identify specific content, methodological, and conceptual similarities
2. PATTERNS IDENTIFICATION: Recognize common approaches, methodologies, or technologies
3. GAP ANALYSIS: Identify specific elements present in successful similar projects but missing from the student's proposal
4. DIFFERENTIATION OPPORTUNITIES: Identify ways the student could make their project more unique
5. RISK ASSESSMENT: Identify potential challenges or pitfalls based on similar projects
```

The response parsing has been improved to handle different formats of LLM responses:

1. First tries to extract numbered lists
2. Then tries to extract bullet points
3. Falls back to paragraph splitting
4. As a last resort, uses sentence splitting

## Usage

### Running the Backfill Script

To update existing projects with the new weighted similarity scores:

```bash
node scripts/backfillWeightedSimilarity.js
```

This script will:
1. Fetch all projects from the database
2. Calculate weighted similarity for each pair of projects
3. Update existing similarity results or create new ones
4. Log progress and results

## Future Improvements

Potential areas for further enhancement:

1. **Embedding Model Experimentation**
   - Test different embedding models available in Ollama
   - Benchmark performance of different models on academic project similarity

2. **Adaptive Similarity Thresholds**
   - Implement dynamic thresholds based on the distribution of similarity scores
   - Adjust thresholds based on department or project type

3. **Visualization of Similarity**
   - Add visualizations to help users understand why projects are considered similar
   - Highlight similar text sections between projects

4. **Caching and Performance**
   - Implement caching of embeddings and similarity calculations
   - Optimize performance for large numbers of projects

5. **Evaluation Framework**
   - Develop a way to measure the quality of similarity matches
   - Collect user feedback on similarity results and recommendations
