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
    // Format project data for the prompt with more details
    const userProject = `
      Title: ${projectData.title || "Untitled Proposal"}
      Problem Statement: ${projectData.problemStatement || "Not provided"}
      Objectives: ${Array.isArray(projectData.objectives) && projectData.objectives.length > 0 
        ? projectData.objectives.map(obj => `- ${obj}`).join('\n      ') 
        : "Not provided"}
      Department: ${projectData.department || "Not specified"}
    `;
    
    // Format similar projects for the prompt with more structured comparison
    const similarProjectsText = similarProjects.map((project, index) => `
      SIMILAR PROJECT ${index + 1} (${project.similarityPercentage}% similarity):
      Title: ${project.title || "Untitled"}
      Problem Statement: ${project.problemStatement || "Not provided"}
      Objectives: ${Array.isArray(project.objectives) && project.objectives.length > 0 
        ? project.objectives.map(obj => `- ${obj}`).join('\n      ') 
        : "Not provided"}
      Department: ${project.department || "Not specified"}
      Academic Year: ${project.academicYear || "Not specified"}
    `).join('\n\n');
    
    // Create a more detailed and structured prompt
    const prompt = `
      You are an academic project advisor tasked with providing detailed recommendations for a student's project proposal.
      
      I'll provide you with:
      1. The student's project proposal details
      2. Information about similar existing projects in our database
      
      Your task is to perform a DETAILED COMPARISON between the proposal and the similar projects, then provide 4-6 specific, actionable recommendations to help the student improve their proposal.
      
      # STUDENT'S PROPOSAL:
      ${userProject}
      
      # SIMILAR EXISTING PROJECTS:
      ${similarProjectsText}
      
      # ANALYSIS INSTRUCTIONS:
      1. First, identify specific similarities and differences between the proposal and each similar project
      2. Look for patterns across the similar projects that might indicate common approaches or methodologies in this field
      3. Identify any potential gaps in the student's proposal compared to the similar projects
      4. Consider how the student could differentiate their project from the similar ones
      
      # RECOMMENDATION INSTRUCTIONS:
      Based on your analysis, provide 4-6 specific, actionable recommendations that:
      1. Address specific gaps or weaknesses in the problem statement compared to similar projects
      2. Suggest concrete improvements or additions to the objectives based on what similar projects have done
      3. Recommend specific approaches, methodologies, or technologies that similar projects have used successfully
      4. Suggest ways the student can differentiate their project from similar ones
      5. Identify potential challenges the student might face based on similar projects
      
      Format your recommendations as a numbered list. Each recommendation should be specific, actionable, and directly related to the comparison between the proposal and similar projects.
      
      IMPORTANT: Your recommendations must be based on the actual content of the proposal and similar projects. Do not make generic recommendations that could apply to any project.
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
