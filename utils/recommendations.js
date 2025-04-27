const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate recommendations based on similarity results
 * @param {Object} projectData - User's project data
 * @param {Array<Object>} similarProjects - Array of similar projects
 * @returns {Promise<Array<String>>} - Array of recommendations
 */
exports.generateRecommendations = async (projectData, similarProjects) => {
  try {
    // Format project data for the prompt
    const userProject = `
      Title: ${projectData.title}
      Problem Statement: ${projectData.problemStatement}
      Objectives: ${projectData.objectives.join(', ')}
    `;
    
    // Format similar projects for the prompt
    const similarProjectsText = similarProjects.map(project => `
      Title: ${project.title}
      Problem Statement: ${project.problemStatement}
      Objectives: ${project.objectives.join(', ')}
      Similarity: ${project.similarityPercentage}%
    `).join('\n');
    
    // Create the prompt
    const prompt = `
      Based on the similarity analysis between the user's project and similar projects, 
      generate 3-5 specific recommendations to improve the project.
      
      User project:
      ${userProject}
      
      Similar projects:
      ${similarProjectsText}
      
      Please provide recommendations that:
      1. Address potential gaps in the problem statement
      2. Suggest improvements to the objectives
      3. Highlight areas where the project could differentiate from similar ones
      4. Recommend specific approaches or methodologies
      
      Return only the recommendations as a numbered list.
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // Extract recommendations from response
    const content = response.choices[0].message.content;
    
    // Split by numbered lines and clean up
    const recommendations = content
      .split(/\d+\./)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Return fallback recommendations if OpenAI fails
    return generateFallbackRecommendations(projectData, similarProjects);
  }
};

/**
 * Generate fallback recommendations when OpenAI fails
 * @param {Object} projectData - User's project data
 * @param {Array<Object>} similarProjects - Array of similar projects
 * @returns {Array<String>} - Array of generic recommendations
 */
const generateFallbackRecommendations = (projectData, similarProjects) => {
  const recommendations = [
    'Consider expanding your problem statement to include more specific details about the challenges you aim to address.',
    'Review your objectives to ensure they are SMART (Specific, Measurable, Achievable, Relevant, Time-bound).',
    'Research recent developments in this field to incorporate the latest methodologies and technologies.',
    'Include a section on limitations and future work to acknowledge the boundaries of your project.',
    'Consider adding more quantitative evaluation metrics to measure the success of your project.'
  ];
  
  // If there are similar projects, add a recommendation about differentiation
  if (similarProjects.length > 0) {
    recommendations.push(
      `Your project shows similarities with "${similarProjects[0].title}". Consider focusing on unique aspects to differentiate your work.`
    );
  }
  
  return recommendations;
};
