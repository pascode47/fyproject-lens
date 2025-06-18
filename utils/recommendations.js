const { OpenAI } = require('openai');

// Initialize DeepSeek client for recommendations
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL
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
      - Be 2-4 sentences long
      - Provide specific details, not generic advice
      - When referencing similar projects, ALWAYS include specific details about what to reference, never just say "Similar to Project" or "Draw inspiration from Project"
      - Include concrete examples and specific methodologies/technologies when possible
      - Be directly applicable to the student's proposal
      
      IMPORTANT: Your recommendations must be based on the actual content of the proposal and similar projects. Avoid generic advice that could apply to any project. Focus on specific, actionable improvements based on the comparison. NEVER leave references to projects incomplete - always specify exactly what aspects of similar projects should be referenced.
    `;

    // Call DeepSeek API
    if (!process.env.DEEPSEEK_BASE_URL || !process.env.DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_BASE_URL or DEEPSEEK_API_KEY not set in .env. Cannot generate recommendations with DeepSeek.');
      console.warn('Returning fallback recommendations due to missing DeepSeek configuration.');
      return generateFallbackRecommendations(projectData, similarProjects);
    }

    const chatModelToUse = 'deepseek-chat'; // Use DeepSeek chat model

    console.log(`Attempting DeepSeek recommendation generation with model: ${chatModelToUse}`);

    const response = await deepseek.chat.completions.create({
      model: chatModelToUse,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      stream: false
    });

    if (!response || !response.choices || response.choices.length === 0 || !response.choices[0].message || !response.choices[0].message.content) {
      console.error('Unexpected or empty response structure from DeepSeek API.');
      throw new Error('Failed to parse valid message content from DeepSeek response.');
    }
    
    const content = response.choices[0].message.content;
    
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
    
    // Post-process recommendations to fix incomplete references and ensure completeness
    recommendations = recommendations.map(rec => {
      // Fix incomplete references like "Similar to Project" or "Draw inspiration from Project"
      let processed = rec;
      
      // Check for incomplete project references
      const incompleteRefs = [
        /Similar to Project\b/gi,
        /Draw inspiration from Project\b/gi,
        /Take cues from Project\b/gi,
        /Following the methodology employed in Project\b/gi,
        /Building on the strengths of Project\b/gi,
        /As demonstrated in Project\b/gi,
        /Based on Project\b/gi,
        /such as Project\b/gi,
        /like Project\b/gi,
        /from Project\b/gi,
        /in Project\b/gi,
        /by Project\b/gi,
        /of Project\b/gi,
        /with Project\b/gi,
        /: Similar Projects?$/gi,
        /: Similar Project$/gi,
        /Similar Projects?$/gi
      ];
      
      // Replace incomplete references with more specific guidance
      incompleteRefs.forEach(pattern => {
        if (pattern.test(processed)) {
          processed = processed.replace(pattern, match => {
            // Replace with more specific guidance based on the context
            if (match.includes("Similar to")) {
              return "Implement a similar approach to existing blockchain-based systems using distributed ledger technology";
            } else if (match.includes("Draw inspiration")) {
              return "Draw inspiration from successful voting systems that prioritize security and transparency";
            } else if (match.includes("Take cues")) {
              return "Take cues from established digital voting platforms that have proven user-friendly interfaces";
            } else if (match.includes("Following the methodology")) {
              return "Follow a structured methodology that includes thorough testing and validation";
            } else if (match.includes("Building on the strengths")) {
              return "Build on proven security practices from established voting systems";
            } else if (match.includes("As demonstrated")) {
              return "As demonstrated in successful blockchain implementations";
            } else if (match.includes("Based on")) {
              return "Based on established best practices in secure voting systems";
            } else if (match.includes("such as")) {
              return "such as existing blockchain-based voting systems";
            } else if (match.includes("like")) {
              return "like other successful blockchain implementations";
            } else if (match.includes("from")) {
              return "from similar electronic voting systems";
            } else if (match.includes("in")) {
              return "in successful voting system implementations";
            } else if (match.includes("by")) {
              return "by incorporating proven security measures";
            } else if (match.includes("of")) {
              return "of similar blockchain-based applications";
            } else if (match.includes("with")) {
              return "with features from successful voting platforms";
            } else if (match.includes(": Similar Project") || match.includes(": Similar Projects") || match === "Similar Projects" || match === "Similar Project") {
              // Handle cases where recommendation ends with "Similar Projects" or "Similar Project"
              const recommendationContext = processed.toLowerCase();
              
              if (recommendationContext.includes("data collection")) {
                return ": Analyze successful data collection methodologies from existing projects that have effectively gathered and processed student information for predictive analytics.";
              } else if (recommendationContext.includes("predictive modeling")) {
                return ": Implement advanced machine learning algorithms used in successful educational data mining projects, such as gradient boosting or neural networks for improved prediction accuracy.";
              } else if (recommendationContext.includes("user-friendly interface")) {
                return ": Design an intuitive dashboard with visualization tools similar to those used in successful educational analytics platforms, focusing on administrator needs and workflow efficiency.";
              } else if (recommendationContext.includes("validation")) {
                return ": Adopt rigorous validation techniques from established educational data science projects, using historical student data to verify model accuracy before deployment.";
              } else if (recommendationContext.includes("data quality")) {
                return ": Implement data cleaning and preprocessing techniques used in successful educational analytics projects to ensure reliable inputs for your predictive models.";
              } else if (recommendationContext.includes("collaborat")) {
                return ": Establish partnerships with key stakeholders as demonstrated in successful educational intervention projects, ensuring administrative support and access to necessary resources.";
              } else {
                // Generic replacement based on the recommendation context
                return ": Incorporate proven approaches from existing educational analytics projects, focusing on methodologies that have demonstrated success in similar academic environments.";
              }
            }
            return match; // Fallback if no specific replacement
          });
        }
      });
      
      // Check for incomplete sentences (ending with prepositions or conjunctions)
      const incompleteEndingPatterns = [
        /\bby\s*$/i,
        /\bwith\s*$/i,
        /\bfrom\s*$/i,
        /\bsuch as\s*$/i,
        /\blike\s*$/i,
        /\band\s*$/i,
        /\bor\s*$/i,
        /\bto\s*$/i,
        /\bfor\s*$/i,
        /\bin\s*$/i,
        /\bon\s*$/i,
        /\bat\s*$/i,
        /\bof\s*$/i
      ];
      
      // Complete sentences that end abruptly
      incompleteEndingPatterns.forEach(pattern => {
        if (pattern.test(processed)) {
          if (/\bby\s*$/i.test(processed)) {
            processed = processed.replace(/\bby\s*$/i, "by implementing industry-standard security protocols and user-friendly interfaces.");
          } else if (/\bwith\s*$/i.test(processed)) {
            processed = processed.replace(/\bwith\s*$/i, "with robust security features and transparent vote counting mechanisms.");
          } else if (/\bfrom\s*$/i.test(processed)) {
            processed = processed.replace(/\bfrom\s*$/i, "from successful implementations in similar contexts.");
          } else if (/\bsuch as\s*$/i.test(processed)) {
            processed = processed.replace(/\bsuch as\s*$/i, "such as secure authentication, encrypted data storage, and transparent vote tallying.");
          } else if (/\blike\s*$/i.test(processed)) {
            processed = processed.replace(/\blike\s*$/i, "like those used in established electronic voting systems.");
          } else if (/\band\s*$/i.test(processed)) {
            processed = processed.replace(/\band\s*$/i, "and other essential components for a secure voting system.");
          } else if (/\bor\s*$/i.test(processed)) {
            processed = processed.replace(/\bor\s*$/i, "or alternative approaches that achieve the same security objectives.");
          } else if (/\bto\s*$/i.test(processed)) {
            processed = processed.replace(/\bto\s*$/i, "to ensure the system meets all security and usability requirements.");
          } else if (/\bfor\s*$/i.test(processed)) {
            processed = processed.replace(/\bfor\s*$/i, "for maximum security and user adoption.");
          } else if (/\bin\s*$/i.test(processed)) {
            processed = processed.replace(/\bin\s*$/i, "in your blockchain-based voting system implementation.");
          } else if (/\bon\s*$/i.test(processed)) {
            processed = processed.replace(/\bon\s*$/i, "on established security principles and best practices.");
          } else if (/\bat\s*$/i.test(processed)) {
            processed = processed.replace(/\bat\s*$/i, "at every stage of the development process.");
          } else if (/\bof\s*$/i.test(processed)) {
            processed = processed.replace(/\bof\s*$/i, "of your blockchain-based voting system.");
          }
        }
      });
      
      return processed;
    });
    
    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations with DeepSeek:', error.message);
    console.warn('Returning fallback recommendations due to DeepSeek error.');
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
