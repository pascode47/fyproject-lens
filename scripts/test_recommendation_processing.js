const { generateRecommendations } = require('../utils/recommendations');

// Sample incomplete recommendations that need fixing
const incompleteRecommendations = [
  "**Consider incorporating a decentralized ledger**: Implement a similar approach to existing blockchain-based systems by",
  "**Expand on the existing digital voting systems analysis**: Building on the objective to analyze existing digital voting systems, expand this section by providing specific examples and insights from similar projects, such as Project",
  "**Include a comprehensive evaluation framework**: Draw inspiration from successful voting systems by",
  "**Conduct a thorough risk assessment**: Building on the objectives of similar projects like Project"
];

// Function to directly test the post-processing logic
function testPostProcessing() {
  console.log("Testing recommendation post-processing...\n");
  console.log("--- Original Incomplete Recommendations ---");
  incompleteRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  // Apply the post-processing logic directly
  const processedRecommendations = incompleteRecommendations.map(rec => {
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
      /with Project\b/gi
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
  
  console.log("\n--- Processed Recommendations ---");
  processedRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  // Check for any remaining incomplete references or sentences
  console.log("\n--- Checking for remaining incomplete references or sentences ---");
  let hasIncompleteRefs = false;
  const incompletePatterns = [
    /Project\b/i,
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
  
  processedRecommendations.forEach((rec, index) => {
    incompletePatterns.forEach(pattern => {
      if (pattern.test(rec)) {
        if (pattern.toString().includes("Project")) {
          console.log(`❌ Recommendation #${index + 1} still contains reference to "Project"`);
          hasIncompleteRefs = true;
        } else {
          console.log(`❌ Recommendation #${index + 1} still ends with "${pattern.toString()}"`);
          hasIncompleteRefs = true;
        }
      }
    });
  });
  
  if (!hasIncompleteRefs) {
    console.log("✅ All recommendations are now complete and specific");
  }
}

// Run the test
testPostProcessing();
