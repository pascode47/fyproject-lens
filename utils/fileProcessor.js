const mammoth = require('mammoth');
const fs = require('fs').promises; // Use promises version for async operations
const path = require('path');
const csv = require('csv-parser'); // Keep for now, might remove later if bulk upload is deferred
const { OpenAI } = require('openai');
const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { Poppler } = require('node-poppler'); // Using node-poppler
const os = require('os'); // For temporary directory
const { v4: uuidv4 } = require('uuid'); // For unique filenames

// DeepSeek LLM Client (for metadata extraction)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL
});

// Nomic Embedding Config
const NOMIC_API_KEY = process.env.NOMIC_API_KEY;
const NOMIC_EMBEDDING_MODEL = 'nomic-embed-text-v1.5'; // Explicit version

/**
 * Extract text from the first ~10 pages of a DOCX file (approximate).
 * @param {String} filePath - Path to DOCX file
 * @param {Number} approxCharsPerPage - Estimated characters per page (adjust as needed)
 * @param {Number} maxPages - Maximum number of pages to approximate (default: 10)
 * @returns {Promise<String>} - Extracted text (limited)
 */
exports.extractLimitedTextFromDocx = async (filePath, approxCharsPerPage = 1800, maxPages = 10) => {
  try {
    // Mammoth extracts full text; we limit it afterwards.
    const fullResult = await mammoth.extractRawText({ path: filePath });
    const fullText = fullResult.value;

    // Estimate the character limit for maxPages
    const charLimit = approxCharsPerPage * maxPages;

    if (fullText.length <= charLimit) {
      console.log(`DOCX text length (${fullText.length}) is within the approximate limit for ${maxPages} pages. Using full text.`);
      return fullText;
    } else {
      console.log(`DOCX text length (${fullText.length}) exceeds limit. Truncating to approximately ${maxPages} pages (${charLimit} chars).`);
      // Simple truncation - more sophisticated methods could be used if needed
      return fullText.substring(0, charLimit);
    }
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
};

/**
 * Extract text from the first ~10 pages of a PDF file. Rejects likely scanned PDFs.
 * @param {String} filePath - Path to PDF file
 * @param {Number} maxPages - Maximum number of pages to process (default: 10)
 * @returns {Promise<String>} - Extracted text from the first maxPages
 * @throws {Error} If PDF parsing fails or minimal text is extracted (likely scanned)
 */
exports.extractLimitedTextFromPdf = async (filePath, maxPages = 10) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    // Options to process only the first 'maxPages'
    const options = {
      max: maxPages,
    };
    const data = await pdf(dataBuffer, options);

    // Check if text extraction yielded significant content from the first pages
    const extractedText = data.text.trim();
    // Increased threshold slightly, adjust as needed
    const minTextLength = 200;

    if (extractedText && extractedText.length > minTextLength) {
      console.log(`Extracted text from first ${data.numpages} pages (up to ${maxPages}) using pdf-parse.`);
      return extractedText;
    } else {
      console.warn(`Minimal text (${extractedText.length} chars) extracted by pdf-parse from first ${maxPages} pages. Attempting OCR with Tesseract.js using node-poppler...`);

      const poppler = new Poppler(); // Assumes Poppler binaries are in PATH
      const tempDir = os.tmpdir();
      const uniqueId = uuidv4();
      // node-poppler's pdfToCairo typically appends page numbers and extension.
      // We provide the base path for the output file.
      const outputImageBase = path.join(tempDir, `ocr_image_${uniqueId}`);
      
      // Options for pdfToCairo to output a PNG for the first page
      const cairoOptions = {
        pngFile: true,
        firstPageToConvert: 1,
        lastPageToConvert: 1,
        // resolutionXY: 300, // Optional: Set DPI for better OCR quality
      };

      let actualOutputImagePath = null; // Will be like outputImageBase-1.png
      let worker; // Declare worker here to access in finally block

      try {
        // Convert the first page of the PDF to PNG
        await poppler.pdfToCairo(filePath, outputImageBase, cairoOptions);
        
        // Determine the actual output path. For single page PNG, it's usually base-1.png
        // This might need adjustment based on how node-poppler names multi-digit pages or if options change.
        actualOutputImagePath = `${outputImageBase}-1.png`; 
        // Verify file exists (optional but good for debugging)
        try {
            await fs.access(actualOutputImagePath);
        } catch (e) {
            console.error(`Converted image not found at expected path: ${actualOutputImagePath}. Checking for alternative naming...`);
            // Fallback for potential single-digit naming if only one page is converted (e.g. outputImageBase.png)
            // This part is heuristic; official docs/testing would confirm exact naming for single page.
            // For now, we stick to the common "-1.png" convention for multi-page capable functions.
            // If issues persist, detailed logging of poppler.pdfToCairo's output or listing tempDir might be needed.
            throw new Error(`Converted image not found. Expected: ${actualOutputImagePath}`);
        }

        console.log(`PDF page 1 converted to temporary image: ${actualOutputImagePath}`);

        // Attempt OCR with Tesseract.js on the converted image
        worker = await createWorker('eng'); // Initialize worker for English
        const { data: { text: ocrText } } = await worker.recognize(actualOutputImagePath);
        
        if (ocrText && ocrText.trim().length > minTextLength) {
          console.log(`Successfully extracted text using Tesseract.js OCR from converted image.`);
          return ocrText.trim();
        } else {
          console.error(`OCR with Tesseract.js also failed to extract sufficient text (${ocrText ? ocrText.trim().length : 0} chars) from converted image.`);
          throw new Error(`Failed to extract sufficient text from the PDF using both standard parsing and OCR. The PDF might be heavily scanned, image-based with non-recognizable text, or corrupted.`);
        }
      } finally {
        // Terminate Tesseract worker if it was initialized
        if (worker) {
          await worker.terminate();
          console.log("Tesseract worker terminated.");
        }
        // Clean up the temporary image file
        if (actualOutputImagePath) {
          try {
            await fs.unlink(actualOutputImagePath);
            console.log(`Temporary OCR image deleted: ${actualOutputImagePath}`);
          } catch (unlinkError) {
            // Log if deletion fails but don't let it crash the main operation
            console.error(`Error deleting temporary OCR image ${actualOutputImagePath}:`, unlinkError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting limited text from PDF (including OCR attempt with node-poppler):', error.message);
    // Re-throw specific errors or a generic one
    if (error.message.includes('Failed to extract sufficient text') || error.message.includes('Poppler')) { // Keep Poppler for node-poppler errors
      throw error; // Keep the specific error message
    }
    throw new Error('Failed to process PDF file.');
  }
};

// --- Metadata Extraction ---

/**
 * Attempts to extract project metadata using local methods (regex, parsing).
 * @param {String} text - Limited text extracted from the document (first ~10 pages).
 * @returns {Object} - An object containing extracted fields (values might be null/empty if not found).
 *                     Expected fields: title, supervisor, students (array), academicYear,
 *                                      programme, problemStatement, objectives (array).
 */
exports.localExtractMetadata = (text) => {
  console.log("--- Attempting local metadata extraction... ---");
  // console.log("Input text for localExtractMetadata (full):", text); // Potentially very long
  console.log("Input text for localExtractMetadata (first 1000 chars):", text.substring(0, 1000));
  const metadata = {
    title: null,
    supervisor: null,
    students: [],
    academicYear: null,
    department: null, // Changed from programme
    problemStatement: null,
    objectives: []
  };

  // --- Regex Definitions ---
  // Title: Look for lines starting with "TITLE" or common title positioning (often all caps near top)
  // Consider multiple patterns, prioritize more specific ones.
  const titleRegex1 = /^\s*TITLE\s*:\s*(.+)$/im;
  const titleRegex2 = /^(?:A\s+PROJECT\s+REPORT\s+ON|PROJECT\s+TITLE\s*[:\-]?)\s*([\s\S]*?)(?:BY|SUBMITTED\s+BY)/i; // More complex, looks for title block
  const titleRegex3 = /^\s*([A-Z][A-Z\s\-]{5,})\s*$/m; // Heuristic: All caps line near top

  // Supervisor: Look for "Supervisor:", "Supervised by", etc.
  // Updated to avoid capturing "Title" as part of the supervisor name
  const supervisorRegex = /SUPERVISOR\s*[:\-]?\s*(Dr\.|Prof\.|Mr\.|Ms\.)?\s*([A-Za-z\s\.\-]+?)(?=\s*\n\s*(?:TITLE|PROJECT|DEPARTMENT|ACADEMIC|YEAR|STUDENTS)|\s*$)/i;

  // Students: Look for "By:", "Submitted by:", "Group Members:", followed by names/reg numbers
  // This is tricky, might need multi-line matching and careful parsing.
  const studentsRegex = /(?:BY|SUBMITTED\s+BY|STUDENTS?|GROUP\s+MEMBERS?)\s*[:\-]?\s*\n?([\s\S]*?)(?:SUPERVISOR|DEPARTMENT|PROGRAMME|YEAR|ABSTRACT|INTRODUCTION)/i; // Capture block

  // Academic Year: Look for "Year:", "Academic Year:", or patterns like 2023/2024, 2023
  const yearRegex1 = /(?:ACADEMIC\s+YEAR|YEAR)\s*[:\-]?\s*(\d{4}\s*[\/\-]\s*\d{2,4}|\d{4})/i;
  const yearRegex2 = /(\b(20\d{2})\s*[\/\-]\s*(20\d{2}|\d{2})\b|\b(20\d{2})\b)/; // Standalone year patterns

  // Department: Look for "Department of...", "Programme:", "Department:"
  // Making this more flexible for "Department of Computer Science" etc.
  const departmentRegex1 = /(?:DEPARTMENT\s*(?:OF|IN|:)?|PROGRAMME\s*[:\-]?)\s*(.+)/i; 
  // Simpler pattern for just a department name that might follow a label
  const departmentRegex2 = /^(?:Department|Programme)\s*[:\s]\s*([A-Za-z\s&]+(?:Department|Science|Engineering|Arts|Studies|Technology|Management|Education|Health|Social Sciences|Law|Agriculture|Business|Environment|Mathematics|Physics|Chemistry|Biology|ICT|Information Technology|Computer Science|Software Engineering|Data Science|Cybersecurity|Networking|Telecommunications|Electronics|Electrical Engineering|Mechanical Engineering|Civil Engineering|Chemical Engineering|Industrial Engineering|Architecture|Urban Planning|Economics|Finance|Accounting|Marketing|Human Resources|Philosophy|History|Geography|Political Science|Sociology|Psychology|Linguistics|Literature|Fine Arts|Music|Performing Arts|Medicine|Nursing|Public Health|Pharmacy|Dentistry|Veterinary Medicine|Forestry|Fisheries|Wildlife Management|Tourism|Hospitality|Journalism|Communication|Media Studies|Library Science|Archival Studies)\b(?:\s*(?:and|of|in)\s*[A-Za-z\s&]+)*)/im;


  // Problem Statement: Look for headings like "Problem Statement", "1.1 Background", "Introduction"
  // Updated to be more flexible with formatting and capture content more reliably
  const problemStatementRegex = /(?:PROBLEM\s+STATEMENT|PROBLEM\s*STATEMENT\s*:|BACKGROUND|INTRODUCTION)(?:[\s\n:]+)([\s\S]*?)(?:OBJECTIVES|METHODOLOGY|LITERATURE\s+REVIEW|CHAPTER\s+2)/i; // Capture section

  // Objectives: Look for "Objectives", "Project Objectives", followed by bullet points or numbered lists
  // Updated to be more flexible with formatting and capture content more reliably
  const objectivesRegex = /(?:PROJECT\s+)?OBJECTIVES(?:[\s\n:]*)([\s\S]*?)(?:METHODOLOGY|SCOPE|CHAPTER|PROBLEM\s+STATEMENT|INTRODUCTION|$)/i; // Capture section, added $ to match end of string

  // --- Extraction Logic ---

  // Title
  let titleMatch = text.match(titleRegex1);
  if (titleMatch && titleMatch[1]) {
    metadata.title = titleMatch[1].trim();
  } else {
    titleMatch = text.match(titleRegex2);
    if (titleMatch && titleMatch[1]) {
       // Clean up potential extra newlines from block capture
       metadata.title = titleMatch[1].replace(/\s*\n\s*/g, ' ').trim();
    } else {
       // Use heuristic as last resort, only on first ~500 chars
       titleMatch = text.substring(0, 500).match(titleRegex3);
       if (titleMatch && titleMatch[1]) {
         metadata.title = titleMatch[1].trim();
       }
    }
  }

  // Supervisor
  const supervisorMatch = text.match(supervisorRegex);
  if (supervisorMatch && supervisorMatch[2]) {
    metadata.supervisor = supervisorMatch[2].replace(/\s+/g, ' ').trim(); // Clean extra spaces
  }

  // Students (Basic parsing - needs improvement)
  const studentsMatch = text.match(studentsRegex);
  if (studentsMatch && studentsMatch[1]) {
    metadata.students = studentsMatch[1]
      .split('\n') // Split block into lines
      .map(line => line.replace(/[\d\.\-\(\)]+/g, '').trim()) // Remove numbers/bullets/reg numbers (simple approach)
      .filter(name => name.length > 3 && name.includes(' ') && !/department|programme|supervisor|abstract|introduction|year/i.test(name)); // Avoid matching section headers
  }

  // Academic Year
  let yearMatch = text.match(yearRegex1);
  if (yearMatch && yearMatch[1]) {
    metadata.academicYear = yearMatch[1].replace(/\s/g, ''); // Remove spaces like in "2023 / 24"
  } else {
    yearMatch = text.match(yearRegex2);
    if (yearMatch) {
      // Determine which capture group matched
      metadata.academicYear = yearMatch[1] || yearMatch[4];
    }
  }

  // Department
  let departmentMatch = text.match(departmentRegex1);
  if (departmentMatch && departmentMatch[1]) {
    let deptName = departmentMatch[1].trim();
    // Remove common prefixes like "B.Sc. in" if they are still caught by the broader regex
    deptName = deptName.replace(/^(?:B\.?Sc\.?|M\.?Sc\.?|Bachelor\s+of\s+Science|Master\s+of\s+Science)\s*(?:in\s+)?/i, '');
    metadata.department = deptName.replace(/\s+/g, ' ').trim();
  } else {
    departmentMatch = text.match(departmentRegex2);
    if (departmentMatch && departmentMatch[1]) {
        metadata.department = departmentMatch[1].replace(/\s+/g, ' ').trim();
    }
  }
  // Further clean-up: if department still looks like a degree, try to extract the core part
  if (metadata.department && (metadata.department.toLowerCase().startsWith('b.sc') || metadata.department.toLowerCase().startsWith('m.sc') || metadata.department.toLowerCase().startsWith('bachelor of') || metadata.department.toLowerCase().startsWith('master of'))) {
      const inMatch = metadata.department.match(/in\s+(.+)/i);
      if (inMatch && inMatch[1]) {
          metadata.department = inMatch[1].trim();
      }
  }


  // Problem Statement (Extract first ~150 words)
  const problemStatementMatch = text.match(problemStatementRegex);
  if (problemStatementMatch && problemStatementMatch[1]) {
    const fullProblem = problemStatementMatch[1].trim();
    metadata.problemStatement = fullProblem.split(/\s+/).slice(0, 150).join(' ') + (fullProblem.length > 150 ? '...' : '');
  }

  // Objectives (Parse list)
  const objectivesMatch = text.match(objectivesRegex);
  if (objectivesMatch && objectivesMatch[1]) {
    metadata.objectives = objectivesMatch[1]
      .split('\n') // Split into lines
      .map(line => line.replace(/^[\s\d\.\*\-•]+/,'').trim()) // Remove leading bullets/numbers/whitespace
      .filter(obj => obj.length > 10); // Filter out short/empty lines
  }

  // --- Final Cleanup ---
  // Trim all string fields
  for (const key in metadata) {
      if (typeof metadata[key] === 'string' && metadata[key] !== null) { // Added null check
          metadata[key] = metadata[key].trim();
      }
  }

  console.log("--- Local extraction results: ---", metadata);
  return metadata;
};

/**
 * Extracts project metadata using OpenAI API (as a fallback).
 * Uses a specific prompt and expects a JSON response.
 * @param {String} textExcerpt - A potentially pruned excerpt of the limited text, optimized for API call.
 * @returns {Promise<Object>} - Extracted project information based on AI response.
 *                              Returns a partial object on error.
 */
exports.aiExtractMetadata = async (textExcerpt) => {
  console.log("--- Attempting AI metadata extraction... ---");
  // Ensure text isn't excessively long for the API call, even if pruned
  // Using a smaller limit here for the API call itself (e.g., ~2000 tokens as planned)
  const apiTokenLimitChars = 24000; // Approx 6000 tokens, increased from 8000
  const truncatedText = textExcerpt.length > apiTokenLimitChars ? textExcerpt.substring(0, apiTokenLimitChars) + '...' : textExcerpt;

  // Use the refined prompt from the plan
  const prompt = `Extract ONLY these fields from the academic project excerpt below. Pay close attention to the initial pages or cover page information for title, supervisor, students, academicYear, and department:

${truncatedText}

Return JSON with:
- title (string)
- supervisor (string) - If not found, use null.
- students (array of strings) - If not found, use an empty array [].
- academicYear (string, extract ONLY a single year in "YYYY" format, for example, "2023". If the text shows a range like "2022/23" or "2022-2023" or "2023/2024", extract ONLY the first year like "2022". do not upload multiple academic year(2023/24) , only single(2023)
- department (string) - Identify the most relevant department for this project from the following list. Respond with ONLY the exact name from the list: ['Department of Computer Science and Engineering (DoCS&E)', 'Department of Electronics and Telecommunications Engineering (ETE)', 'Department of Information Systems and Technology (DIS&T)']. If none of the listed departments are a clear match based on the project text, respond with the value 'Other'. If no department information can be inferred, use null.
- problemStatement (string, <100 words) - If not found, use null.
- objectives (array of strings. These should be specific, actionable project goals, usually starting with "To design...", "To develop...", "To implement...", "To investigate...", "To analyze...", "To test...". Look for a list under a heading like "Objectives" or "Project Objectives".) - If not found, use an empty array [].

IGNORE all other information. If a value for a field cannot be found in the text, use null for string fields or an empty array for array fields. DO NOT use placeholder values like 'Not specified' or 'Your Name'. Respond ONLY with the JSON object.`;
  
  try {
    console.log(`Using DeepSeek (${process.env.DEEPSEEK_BASE_URL}) for metadata extraction`);
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    // Process response
    const content = response.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek metadata extraction failed:', error);
    return {};
  }
};

/**
 * Validates the extracted metadata to ensure it contains the necessary information
 * for similarity analysis.
 * @param {Object} metadata - The metadata object to validate
 * @returns {Object} - Object containing validation result and missing fields
 */
exports.validateMetadata = (metadata) => {
  const requiredFields = {
    title: 'Title',
    problemStatement: 'Problem Statement',
    objectives: 'Objectives'
  };
  
  const missingFields = [];
  
  // Check each required field
  for (const [field, label] of Object.entries(requiredFields)) {
    if (field === 'objectives') {
      // For array fields, check if they exist and have content
      if (!metadata[field] || !Array.isArray(metadata[field]) || metadata[field].length === 0) {
        missingFields.push(label);
      }
    } else {
      // For string fields, check if they exist and are not empty
      if (!metadata[field] || typeof metadata[field] !== 'string' || metadata[field].trim() === '') {
        missingFields.push(label);
      }
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields
  };
};

// --- Embeddings ---

/**
 * Preprocess text for embedding generation
 * @param {String} text - Text to preprocess
 * @returns {String} - Preprocessed text
 */
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
    'has', 'have', 'had', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 
    'for', 'with', 'by', 'about', 'like', 'through', 'over', 'before', 'after',
    'this', 'that', 'these', 'those', 'it', 'its', 'it\'s', 'they', 'them', 'their',
    'we', 'us', 'our', 'i', 'me', 'my', 'you', 'your'
  ];
  
  // Only remove whole words (not parts of words)
  const words = processed.split(' ');
  const filteredWords = words.filter(word => !fillerWords.includes(word));
  
  // Join back with spaces
  return filteredWords.join(' ');
};

/**
 * Generate embeddings using OpenAI based on key project fields.
 * @param {Object} metadata - Object containing extracted metadata. Expected keys: title, problemStatement, objectives.
 * @returns {Promise<Array<Number>>} - Embeddings array, or empty array on failure/missing data.
 */
exports.generateEmbeddings = async (metadata) => {
  // Construct the text input for embeddings from specific fields
  const { title, problemStatement, objectives, department } = metadata;
  
  // Create weighted sections with appropriate preprocessing
  let embeddingInput = '';

  // Title is important - give it more weight by repeating it
  if (title) {
    const processedTitle = preprocessTextForEmbedding(title);
    embeddingInput += `Title: ${processedTitle}\n${processedTitle}\n\n`;
  }
  
  // Problem statement is a core component
  if (problemStatement) {
    const processedProblemStatement = preprocessTextForEmbedding(problemStatement);
    embeddingInput += `Problem Statement: ${processedProblemStatement}\n\n`;
  }
  
  // Objectives are important for determining project similarity
  if (objectives && objectives.length > 0) {
    const processedObjectives = objectives.map(obj => preprocessTextForEmbedding(obj));
    embeddingInput += `Objectives:\n${processedObjectives.map(o => `- ${o}`).join('\n')}\n\n`;
  }
  
  // Department can provide context for domain-specific terminology
  if (department) {
    const processedDepartment = preprocessTextForEmbedding(department);
    embeddingInput += `Department: ${processedDepartment}`;
  }

  embeddingInput = embeddingInput.trim();

  // Basic check for empty input
  if (embeddingInput.length === 0) {
    console.warn('No content available (title, problem statement, objectives) to generate embeddings.');
    return []; // Return empty array
  }

  console.log("Constructed embeddingInput (first 500 chars):", embeddingInput.substring(0, 500));
  console.log("Length of embeddingInput:", embeddingInput.length);

  // --- START NOMIC API FETCH ---
  try {
    const response = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOMIC_API_KEY}`
      },
      body: JSON.stringify({
        model: NOMIC_EMBEDDING_MODEL,
        texts: [embeddingInput],
        task_type: 'search_document' // Best for project documents
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { embeddings } = await response.json();
    return embeddings?.[0] || []; // Return first embedding or empty array
  } catch (error) {
    console.error('Nomic embedding failed:', error.message);
    return [];
  }
  // --- END NOMIC API FETCH ---
};

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {Array<Number>} a - First embedding vector
 * @param {Array<Number>} b - Second embedding vector
 * @returns {Number} - Similarity score (0-1)
 */
exports.calculateCosineSimilarity = (a, b) => {
  if (!a || !b || a.length === 0 || a.length !== b.length) {
    // Added check for empty arrays
    console.warn('Cannot calculate cosine similarity for invalid or mismatched vectors.');
    return 0;
  }

  // Calculate dot product
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);

  // Calculate magnitudes
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Calculate cosine similarity
  // Clamp result between 0 and 1 (due to potential floating point inaccuracies)
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return Math.max(0, Math.min(1, similarity));
};

/**
 * Calculate weighted similarity between projects based on their metadata
 * This function can be used as an alternative to direct embedding comparison
 * @param {Object} projectA - First project metadata
 * @param {Object} projectB - Second project metadata
 * @param {Object} weights - Optional weights for different components (default weights provided)
 * @returns {Number} - Weighted similarity score (0-1)
 */
exports.calculateWeightedSimilarity = (projectA, projectB, weights = null) => {
  // Default weights if not provided
  const defaultWeights = {
    title: 0.15,
    problemStatement: 0.40,
    objectives: 0.35,
    department: 0.10
  };
  
  // Use provided weights or defaults
  const finalWeights = weights || defaultWeights;
  
  // Ensure weights sum to 1
  const weightSum = Object.values(finalWeights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1) > 0.001) {
    console.warn(`Weights do not sum to 1 (sum: ${weightSum}). Normalizing weights.`);
    Object.keys(finalWeights).forEach(key => {
      finalWeights[key] = finalWeights[key] / weightSum;
    });
  }
  
  let totalSimilarity = 0;
  let totalWeightApplied = 0;
  
  // Calculate title similarity if both have titles
  if (projectA.title && projectB.title) {
    const titleA = preprocessTextForEmbedding(projectA.title);
    const titleB = preprocessTextForEmbedding(projectB.title);
    
    // Simple word overlap for title (can be enhanced with more sophisticated methods)
    const wordsA = new Set(titleA.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(titleB.split(' ').filter(w => w.length > 2));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    const titleSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    totalSimilarity += titleSimilarity * finalWeights.title;
    totalWeightApplied += finalWeights.title;
  }
  
  // Calculate problem statement similarity if both have problem statements
  if (projectA.problemStatement && projectB.problemStatement) {
    const psA = preprocessTextForEmbedding(projectA.problemStatement);
    const psB = preprocessTextForEmbedding(projectB.problemStatement);
    
    // More sophisticated text similarity for problem statements
    // Using TF-IDF inspired approach for term importance
    const wordsA = psA.split(' ').filter(w => w.length > 2);
    const wordsB = psB.split(' ').filter(w => w.length > 2);
    
    // Count word frequencies
    const freqA = {};
    const freqB = {};
    
    wordsA.forEach(word => {
      freqA[word] = (freqA[word] || 0) + 1;
    });
    
    wordsB.forEach(word => {
      freqB[word] = (freqB[word] || 0) + 1;
    });
    
    // Get unique words from both texts
    const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
    
    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    allWords.forEach(word => {
      const a = freqA[word] || 0;
      const b = freqB[word] || 0;
      
      dotProduct += a * b;
      magnitudeA += a * a;
      magnitudeB += b * b;
    });
    
    // Calculate cosine similarity
    const psSimilarity = (magnitudeA > 0 && magnitudeB > 0) 
      ? dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
      : 0;
    
    totalSimilarity += psSimilarity * finalWeights.problemStatement;
    totalWeightApplied += finalWeights.problemStatement;
  }
  
  // Calculate objectives similarity if both have objectives
  if (projectA.objectives && projectB.objectives && 
      Array.isArray(projectA.objectives) && Array.isArray(projectB.objectives) &&
      projectA.objectives.length > 0 && projectB.objectives.length > 0) {
    
    // Preprocess all objectives
    const objsA = projectA.objectives.map(obj => preprocessTextForEmbedding(obj));
    const objsB = projectB.objectives.map(obj => preprocessTextForEmbedding(obj));
    
    // Calculate pairwise similarities between objectives
    let totalObjSimilarity = 0;
    
    // For each objective in A, find the most similar objective in B
    objsA.forEach(objA => {
      let maxSimilarity = 0;
      
      objsB.forEach(objB => {
        // Simple word overlap for objectives
        const wordsA = new Set(objA.split(' ').filter(w => w.length > 2));
        const wordsB = new Set(objB.split(' ').filter(w => w.length > 2));
        
        const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
        const union = new Set([...wordsA, ...wordsB]);
        
        const similarity = union.size > 0 ? intersection.size / union.size : 0;
        maxSimilarity = Math.max(maxSimilarity, similarity);
      });
      
      totalObjSimilarity += maxSimilarity;
    });
    
    // Normalize by the number of objectives in A
    const objSimilarity = objsA.length > 0 ? totalObjSimilarity / objsA.length : 0;
    
    totalSimilarity += objSimilarity * finalWeights.objectives;
    totalWeightApplied += finalWeights.objectives;
  }
  
  // Calculate department similarity (exact match or not)
  if (projectA.department && projectB.department) {
    const deptA = projectA.department.toLowerCase().trim();
    const deptB = projectB.department.toLowerCase().trim();
    
    // Exact match gets full similarity, otherwise 0
    // Could be enhanced with department hierarchies or related fields
    const deptSimilarity = deptA === deptB ? 1 : 0;
    
    totalSimilarity += deptSimilarity * finalWeights.department;
    totalWeightApplied += finalWeights.department;
  }
  
  // If no weights were applied (no matching fields), return 0
  if (totalWeightApplied === 0) {
    return 0;
  }
  
  // Normalize by the total weight applied
  return totalSimilarity / totalWeightApplied;
};
