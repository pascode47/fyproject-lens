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
    
    // Create a more detailed and structured prompt with improved guidance
    const prompt = `
      You are an academic project advisor with expertise in providing detailed, actionable recommendations for student project proposals. Your goal is to help students improve their proposals by leveraging insights from similar existing projects.
      
      # STUDENT'S PROPOSAL:
      ${userProject}
      
      # SIMILAR EXISTING PROJECTS:
      ${similarProjectsText}
      
      # ANALYSIS APPROACH:
      1. SIMILARITIES ANALYSIS: Identify specific content, methodological, and conceptual similarities between the proposal and each similar project
      2. PATTERNS IDENTIFICATION: Recognize common approaches, methodologies, or technologies across the similar projects
      3. GAP ANALYSIS: Identify specific elements present in successful similar projects but missing from the student's proposal
      4. DIFFERENTIATION OPPORTUNITIES: Identify ways the student could make their project more unique or innovative
      5. RISK ASSESSMENT: Identify potential challenges or pitfalls based on similar projects
      
      # RECOMMENDATION GUIDELINES:
      Based on your analysis, provide 5-7 specific, actionable recommendations that:
      - Are concrete and implementable (not vague suggestions)
      - Address specific gaps or weaknesses compared to similar projects
      - Suggest specific methodologies, technologies, or approaches
      - Recommend ways to differentiate the project
      - Identify potential challenges and how to address them
      - Are tailored to the specific department/field of study
      
      # OUTPUT FORMAT:
      Present your recommendations as a numbered list (1., 2., 3., etc.). Each recommendation should:
      - Begin with a clear action verb (Consider, Implement, Expand, Include, etc.)
      - Be 1-3 sentences long
      - Provide specific details, not generic advice
      - Reference specific elements from the similar projects when relevant
      - Be directly applicable to the student's proposal
      
      IMPORTANT: Your recommendations must be based on the actual content of the proposal and similar projects. Avoid generic advice that could apply to any project. Focus on specific, actionable improvements based on the comparison.
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
    
    // Improved parsing of recommendations from LLM response
    let recommendations = [];
    
    // First, try to extract a numbered list using regex
    const numberedListRegex = /\d+\.\s*([^\d\n]+(?:\n(?!\d+\.).*)*)/g;
    let match;
    while ((match = numberedListRegex.exec(content)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        // Clean up the recommendation text
        const recommendation = match[1]
          .replace(/\n+/g, ' ')  // Replace newlines with spaces
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
        
        recommendations.push(recommendation);
      }
    }
    
    // If no numbered list was found, try to extract bullet points
    if (recommendations.length === 0) {
      const bulletListRegex = /[-•*]\s*([^-•*\n]+(?:\n(?![-•*]).*)*)/g;
      while ((match = bulletListRegex.exec(content)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          const recommendation = match[1]
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          recommendations.push(recommendation);
        }
      }
    }
    
    // If neither numbered list nor bullet points were found, split by paragraphs
    if (recommendations.length === 0) {
      recommendations = content
        .split(/\n\s*\n/)  // Split by empty lines
        .map(para => para.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(para => para.length > 10);  // Only include substantial paragraphs
    }
    
    // If all parsing methods failed but there's content, return the whole content as a single recommendation
    if (recommendations.length === 0 && content.trim().length > 0) {
      console.warn("Could not parse recommendations into a list, returning raw content as one item.");
      return [content.trim()];
    }
    
    // Ensure we have a reasonable number of recommendations (3-7)
    if (recommendations.length > 7) {
      console.log(`Limiting recommendations from ${recommendations.length} to 7`);
      recommendations = recommendations.slice(0, 7);
    } else if (recommendations.length < 3 && content.length > 100) {
      // If we have too few recommendations but substantial content,
      // try a simpler approach of splitting by sentences
      console.log(`Only found ${recommendations.length} recommendations, trying sentence splitting`);
      const sentences = content
        .replace(/([.!?])\s+/g, "$1|")  // Mark sentence boundaries
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 15 && /[a-zA-Z]/.test(s));  // Only include substantial sentences with letters
      
      if (sentences.length >= 3) {
        recommendations = sentences.slice(0, 5);  // Take up to 5 sentences
      }
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
