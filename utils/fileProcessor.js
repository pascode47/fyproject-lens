const mammoth = require('mammoth');
const fs = require('fs').promises; // Use promises version for async operations
const path = require('path');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Extract text from DOCX file
 * @param {String} filePath - Path to DOCX file
 * @returns {Promise<String>} - Extracted text
 */
exports.extractTextFromDocx = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
};

/**
 * Extract text from PDF file, attempting OCR if needed
 * @param {String} filePath - Path to PDF file
 * @returns {Promise<String>} - Extracted text
 */
exports.extractTextFromPdf = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    // Check if text extraction yielded significant content
    if (data.text && data.text.trim().length > 100) { // Threshold to decide if it's likely text-based
      console.log('Extracted text using pdf-parse.');
      return data.text;
    } else {
      // If minimal text, assume scanned PDF and use OCR
      console.log('Minimal text extracted with pdf-parse, attempting OCR with Tesseract...');
      const worker = await createWorker('eng'); // Initialize Tesseract worker for English
      const { data: { text } } = await worker.recognize(filePath);
      await worker.terminate(); // Terminate worker after use
      console.log('Extracted text using Tesseract OCR.');
      return text;
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Attempt OCR as a fallback if pdf-parse fails entirely
    try {
      console.log('pdf-parse failed, attempting OCR with Tesseract as fallback...');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(filePath);
      await worker.terminate();
      console.log('Extracted text using Tesseract OCR (fallback).');
      return text;
    } catch (ocrError) {
      console.error('OCR fallback also failed:', ocrError);
      throw new Error('Failed to extract text from PDF file using both methods');
    }
  }
};


/**
 * Extract project information using OpenAI
 * @param {String} text - Extracted text from DOCX or PDF
 * @returns {Promise<Object>} - Extracted project information
 */
exports.extractProjectInfo = async (text) => {
  try {
    // Truncate text if it's too long (OpenAI has token limits)
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text;
    
    const prompt = `Extract the project title, problem statement, and objectives from this text: 
    
    ${truncatedText}
    
    Return as JSON: {title: "", problemStatement: "", objectives: [], department: "", year: ""}`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    const content = response.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const extractedInfo = JSON.parse(content);
      return extractedInfo;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      
      // Fallback to regex extraction if JSON parsing fails
      return extractInfoWithRegex(text);
    }
  } catch (error) {
    console.error('Error extracting project info with OpenAI:', error);
    
    // Fallback to regex extraction if OpenAI fails
    return extractInfoWithRegex(text);
  }
};

/**
 * Extract project information using regex (fallback method)
 * @param {String} text - Extracted text from DOCX or PDF
 * @returns {Object} - Extracted project information
 */
const extractInfoWithRegex = (text) => {
  // Simple regex patterns to extract information
  const titlePattern = /title:?\s*([^\n]+)/i;
  const problemPattern = /problem\s+statement:?\s*([^#]+)/i;
  const objectivesPattern = /objectives?:?\s*([^#]+)/i;
  const departmentPattern = /department:?\s*([^\n]+)/i;
  const yearPattern = /(20\d{2})/;
  
  // Extract title
  const titleMatch = text.match(titlePattern);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Project';
  
  // Extract problem statement
  const problemMatch = text.match(problemPattern);
  const problemStatement = problemMatch ? problemMatch[1].trim() : '';
  
  // Extract objectives
  const objectivesMatch = text.match(objectivesPattern);
  let objectives = [];
  
  if (objectivesMatch) {
    // Split by numbers, bullets, or new lines
    const objectivesText = objectivesMatch[1];
    objectives = objectivesText
      .split(/(?:\r?\n|•|\d+\.)/)
      .map(obj => obj.trim())
      .filter(obj => obj.length > 0);
  }
  
  // Extract department
  const departmentMatch = text.match(departmentPattern);
  const department = departmentMatch ? departmentMatch[1].trim() : 'Unknown';
  
  // Extract year
  const yearMatch = text.match(yearPattern);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  
  return {
    title,
    problemStatement,
    objectives,
    department,
    year
  };
};

/**
 * Generate embeddings for text using OpenAI
 * @param {String} text - Text to generate embeddings for
 * @returns {Promise<Array<Number>>} - Embeddings array
 */
exports.generateEmbeddings = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
};

/**
 * Process CSV file for bulk project upload
 * @param {String} filePath - Path to CSV file
 * @returns {Promise<Array<Object>>} - Array of project objects
 */
exports.processCsvFile = async (filePath) => {
  const results = [];
  const stream = require('fs').createReadStream(filePath).pipe(csv()); // Use require('fs') here for stream

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => results.push(data))
      .on('end', () => {
        // Validate and transform CSV data
        const projects = results.map(row => {
          // Convert objectives from string to array if needed
          let objectives = row.objectives;
          if (typeof objectives === 'string') {
            objectives = objectives.split(';').map(obj => obj.trim());
          }
          
          return {
            title: row.title,
            problemStatement: row.problemStatement,
            objectives: objectives,
            department: row.department,
            year: row.year
          };
        });
        
        resolve(projects);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {Array<Number>} a - First embedding vector
 * @param {Array<Number>} b - Second embedding vector
 * @returns {Number} - Similarity score (0-1)
 */
exports.calculateCosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }
  
  // Calculate dot product
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  
  // Calculate magnitudes
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  // Calculate cosine similarity
  return dotProduct / (magnitudeA * magnitudeB);
};
