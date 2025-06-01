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

// Initialize API client (Configured for Local Ollama)
const ollama = new OpenAI({
  apiKey: 'ollama', // Placeholder API key - Ollama ignores it but SDK might require it
  baseURL: process.env.OLLAMA_BASE_URL // Use Ollama base URL from .env
});

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

/**
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
  const supervisorRegex = /SUPERVISOR\s*[:\-]?\s*(Dr\.|Prof\.|Mr\.|Ms\.)?\s*([A-Za-z\s\.\-]+)/i;

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
  const problemStatementRegex = /(?:PROBLEM\s+STATEMENT|BACKGROUND|INTRODUCTION)(?:[\s\n]+)([\s\S]*?)(?:OBJECTIVES|METHODOLOGY|LITERATURE\s+REVIEW|CHAPTER\s+2)/i; // Capture section

  // Objectives: Look for "Objectives", "Project Objectives", followed by bullet points or numbered lists
  const objectivesRegex = /(?:PROJECT\s+)?OBJECTIVES(?:[\s\n]+)([\s\S]*?)(?:METHODOLOGY|SCOPE|CHAPTER|PROBLEM\s+STATEMENT|INTRODUCTION)/i; // Capture section

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
  
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
  const chatModelToUse = process.env.OLLAMA_CHAT_MODEL || 'llama3'; // Use specific chat model
    
  try {
    console.log(`--- Attempting Ollama AI metadata extraction with model: ${chatModelToUse} using direct fetch to ${ollamaBaseUrl}/api/chat ---`);
    const fetchResponse = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatModelToUse, // Use chat model
        messages: [{ role: 'user', content: prompt }],
        format: "json", // Request JSON output from Ollama
        stream: false,
        options: {
          temperature: 0.2,
        }
      }),
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error(`Ollama API error for AI metadata! Status: ${fetchResponse.status}, Body: ${errorBody}`);
      throw new Error(`Ollama API request for AI metadata failed with status ${fetchResponse.status}`);
    }

    const responseJson = await fetchResponse.json();
    
    if (!responseJson || !responseJson.message || !responseJson.message.content) {
      console.error('Unexpected or empty response structure from Ollama /api/chat for metadata.');
      return {};
    }
    
    const content = responseJson.message.content;
    console.log("--- Raw AI Response from Ollama for metadata: ---", content);

    // Parse the JSON response
    try {
      // Attempt to clean potential markdown ```json ... ``` markers
      const cleanedContent = content.replace(/^```json\s*|```$/g, '').trim();
      const extractedInfo = JSON.parse(cleanedContent);
      console.log("--- Parsed AI extraction results: ---", extractedInfo);
      // Basic validation (ensure it's an object)
      if (typeof extractedInfo === 'object' && extractedInfo !== null) {
        return extractedInfo;
      } else {
        console.error('AI response was not a valid JSON object:', cleanedContent);
        return {}; // Return empty object on invalid structure
      }
    } catch (parseError) {
      console.error('Error parsing Ollama JSON response for metadata:', parseError, 'Raw content:', content);
      return {}; // Return empty object on parsing failure
    }
  } catch (error) {
    console.error('Error calling Ollama API for metadata extraction:', error);
    return {}; // Return empty object on API call failure
  }
};

/**
  }
};


/**
 * Extract project information using regex (DEPRECATED)
 */
// const extractInfoWithRegex = (text) => { ... }; // Commented out


// --- Embeddings ---

/**
 * Generate embeddings using OpenAI based on key project fields.
 * @param {Object} metadata - Object containing extracted metadata. Expected keys: title, problemStatement, objectives.
 * @returns {Promise<Array<Number>>} - Embeddings array, or empty array on failure/missing data.
 */
exports.generateEmbeddings = async (metadata) => {
  // Construct the text input for embeddings from specific fields
  const { title, problemStatement, objectives } = metadata;
  let embeddingInput = '';

  if (title) embeddingInput += `Title: ${title}\n`;
  if (problemStatement) embeddingInput += `Problem Statement: ${problemStatement}\n`;
  if (objectives && objectives.length > 0) {
    embeddingInput += `Objectives:\n${objectives.map(o => `- ${o}`).join('\n')}`;
  }

  embeddingInput = embeddingInput.trim();

  // Basic check for empty input
  if (embeddingInput.length === 0) {
    console.warn('No content available (title, problem statement, objectives) to generate embeddings.');
    return []; // Return empty array
  }

  console.log("Constructed embeddingInput (first 500 chars):", embeddingInput.substring(0, 500));
  console.log("Length of embeddingInput:", embeddingInput.length);

  // --- START TEMPORARY FETCH TEST ---
  try {
    const embeddingModelToUse = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'; // Use specific embedding model
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

    if (!ollamaBaseUrl) {
      console.error('OLLAMA_BASE_URL is not set in .env file. Cannot generate embeddings.');
      throw new Error('Ollama base URL not configured.');
    }
    
    console.log(`[DIRECT FETCH TEST] Attempting Ollama embedding with model: ${embeddingModelToUse} at ${ollamaBaseUrl}/api/embeddings`);

    const fetchResponse = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: embeddingModelToUse, // Use embedding model
        prompt: embeddingInput, // Using 'prompt' as per Ollama API docs for /api/embeddings
      }),
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error(`[DIRECT FETCH TEST] Ollama API error! Status: ${fetchResponse.status}, Body: ${errorBody}`);
      throw new Error(`Ollama API request failed with status ${fetchResponse.status}`);
    }

    const responseJson = await fetchResponse.json();
    // console.log("[DIRECT FETCH TEST] Raw JSON response from Ollama embeddings endpoint:", JSON.stringify(responseJson, null, 2)); // Commented out for brevity

    let embeddingVector = null;
    if (responseJson && responseJson.embedding && Array.isArray(responseJson.embedding)) {
      embeddingVector = responseJson.embedding;
    }
    
    if (embeddingVector && embeddingVector.length > 0) {
      const allZeros = embeddingVector.every(element => element === 0);
      if (allZeros) {
        console.warn(`[DIRECT FETCH TEST] Warning: Ollama returned an embedding vector of all zeros for model ${embeddingModelToUse} and input: ${embeddingInput.substring(0,100)}...`);
      } else {
        console.log(`[DIRECT FETCH TEST] Successfully received non-zero embeddings. First 5 values: ${embeddingVector.slice(0,5).join(', ')}`);
      }
      // If direct fetch works, we return this. If not, the original catch block will handle it.
      // This effectively bypasses the ollama SDK client for this test.
      return embeddingVector; 
    } else {
       console.error('[DIRECT FETCH TEST] Unexpected or empty response structure from Ollama embeddings. Full response logged above.');
       throw new Error('Failed to parse valid embeddings from Ollama response using direct fetch.');
    }

  } catch (error) {
    console.error(`[DIRECT FETCH TEST] Error generating embeddings with model ${process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'}:`, error.message);
    // Log the full error object if it has more details
    if (error.response && error.response.data) { // This was for the SDK, might not apply to fetch
      console.error("[DIRECT FETCH TEST] Ollama error response data (if available from SDK error structure):", JSON.stringify(error.response.data, null, 2));
    }
    // We throw the error to indicate failure of this test, allowing the script to log it.
    // The main script's error handling will catch this.
    throw new Error(`[DIRECT FETCH TEST] Failed to generate embeddings: ${error.message}`);
  }
  // --- END TEMPORARY FETCH TEST ---

  // Original code using ollama SDK (now effectively bypassed if fetch test is conclusive)
  // Kept for reference or if we revert.
  /*
  try {
    const modelToUse = process.env.OLLAMA_MODEL || 'llama3';
    console.log(`Attempting Ollama embedding with model: ${modelToUse}`);
    
    if (!process.env.OLLAMA_BASE_URL) {
      console.error('OLLAMA_BASE_URL is not set in .env file. Cannot generate embeddings.');
      throw new Error('Ollama base URL not configured.');
    }

    const response = await ollama.embeddings.create({
      model: modelToUse, 
      input: embeddingInput // For OpenAI SDK, 'input' is the correct parameter name
    });

    console.log("Raw response from Ollama embeddings endpoint (SDK):", JSON.stringify(response, null, 2));

    let embeddingVector = null;
    if (response.data && Array.isArray(response.data) && response.data.length > 0 && response.data[0].embedding) {
      embeddingVector = response.data[0].embedding;
    } else if (response.embedding && Array.isArray(response.embedding)) { 
      console.log("Found embedding directly in response.embedding (SDK)");
      embeddingVector = response.embedding;
    }
    
    if (embeddingVector && embeddingVector.length > 0) {
      const allZeros = embeddingVector.every(element => element === 0);
      if (allZeros) {
        console.warn(`Warning (SDK): Ollama returned an embedding vector of all zeros for model ${modelToUse} and input: ${embeddingInput.substring(0,100)}...`);
      } else {
        console.log(`Successfully received non-zero embeddings (SDK). First 5 values: ${embeddingVector.slice(0,5).join(', ')}`);
      }
      return embeddingVector;
    } else {
       console.error('Unexpected or empty response structure from Ollama embeddings (SDK). Full response logged above.');
       throw new Error('Failed to parse valid embeddings from Ollama response (SDK).');
    }
  } catch (error) {
    console.error(`Error generating embeddings with model ${process.env.OLLAMA_MODEL || 'llama3'} (SDK):`, error.message);
    if (error.response && error.response.data) {
      console.error("Ollama error response data (SDK):", JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Failed to generate embeddings (SDK): ${error.message}`);
  }
  */
};

/**
};


/**
 * Process CSV file for bulk project upload (DEFERRED / REMOVED)
 */
// exports.processCsvFile = async (filePath) => { ... }; // Commented out


// --- Similarity ---

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

// Removed duplicated function definitions below this line
