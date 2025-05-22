const { OpenAI } = require('openai'); // OpenAI class is used for Ollama client as well

// Initialize Ollama client
const ollama = new OpenAI({
  apiKey: process.env.OLLAMA_API_KEY || 'ollama', // Ollama might ignore API key, but SDK might require it. Use a placeholder.
  baseURL: process.env.OLLAMA_BASE_URL // Ensure OLLAMA_BASE_URL is in your .env file
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

    // Call Ollama API
    if (!process.env.OLLAMA_BASE_URL) {
      console.error('OLLAMA_BASE_URL not set in .env. Cannot generate recommendations with Ollama.');
      console.warn('Returning fallback recommendations due to missing Ollama configuration.');
      return generateFallbackRecommendations(projectData, similarProjects);
    }
    if (!process.env.OLLAMA_MODEL) {
      console.warn('OLLAMA_MODEL not set in .env. Defaulting to "llama3" for recommendations.');
    }

    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
    const chatModelToUse = process.env.OLLAMA_CHAT_MODEL || 'llama3'; // Use specific chat model

    console.log(`Attempting Ollama recommendation generation with model: ${chatModelToUse} using direct fetch to ${ollamaBaseUrl}/api/chat`);

    const fetchResponse = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatModelToUse, // Use chat model
        messages: [{ role: 'user', content: prompt }],
        stream: false, // Important: Ollama's /api/chat expects this for non-streaming
        options: { // Ollama specific options can go here
          temperature: 0.5,
          // max_tokens is not a direct parameter for Ollama's /api/chat in the same way,
          // context window and model limits apply.
          // num_predict could be an equivalent if needed, but often not required for short completions.
        }
      }),
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error(`Ollama API error for chat! Status: ${fetchResponse.status}, Body: ${errorBody}`);
      throw new Error(`Ollama API request for chat failed with status ${fetchResponse.status}`);
    }

    const responseJson = await fetchResponse.json();
    // console.log("Raw JSON response from Ollama /api/chat endpoint:", JSON.stringify(responseJson, null, 2));

    if (!responseJson || !responseJson.message || !responseJson.message.content) {
      console.error('Unexpected or empty response structure from Ollama /api/chat. Full response logged above if enabled.');
      throw new Error('Failed to parse valid message content from Ollama chat response.');
    }
    
    const content = responseJson.message.content;
    
    // Attempt to parse numbered list, otherwise return raw content split by newlines
    let recommendations;
    if (/\d+\./.test(content)) { // Check if content contains numbered list pattern
        recommendations = content
        .split(/\d+\.\s*/) // Split by number, dot, and optional space
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } else {
        // If not a clear numbered list, split by newline and filter empty lines
        recommendations = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    if (recommendations.length === 0 && content.length > 0) {
        // If splitting failed but there's content, return the whole content as a single recommendation
        console.warn("Could not parse recommendations into a list, returning raw content as one item.");
        return [content.trim()];
    }
    
    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations with Ollama:', error.message);
    console.warn('Returning fallback recommendations due to Ollama error.');
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
