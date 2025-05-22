const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function for different upload types
const fileFilter = (req, file, cb) => {
  // Determine allowed types based on the route or fieldname if necessary
  // For general project uploads (docx, pdf) and proposal uploads
  if (file.fieldname === 'projectFile' || file.fieldname === 'proposalFile') {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx and .pdf files are allowed for project/proposal uploads'), false);
    }
  }
  // For bulk CSV uploads
  else if (file.fieldname === 'csvFile') {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed for bulk uploads'), false);
    }
  } 
  // Default deny if fieldname doesn't match expected ones
  else {
    cb(new Error('Invalid file upload field'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware for handling docx file uploads
exports.uploadDocx = upload.single('projectFile');

// Middleware for handling proposal file uploads
exports.uploadProposal = upload.single('proposalFile');

// Middleware for handling CSV file uploads
exports.uploadCsv = upload.single('csvFile');

// Error handler for multer
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};
