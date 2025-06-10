const express = require('express');
const { similarityController } = require('../controllers');
const { auth, upload } = require('../middleware'); // Correctly import upload which contains handleUploadError

const router = express.Router();

// All routes are protected
router.use(auth.protect);

// Get user's similarity history
router.get('/history', similarityController.getUserSimilarityHistory);

// Get similarity results for a project
router.get('/:projectId', similarityController.getSimilarityResults);

// Analyze a project for similarities
router.post('/analyze', similarityController.analyzeSimilarity);

// Check similarity of an uploaded proposal
router.post(
  '/check-proposal',
  upload.uploadProposal, // Use the new 'proposalFile' upload middleware
  upload.handleUploadError,    // Access handleUploadError from the upload object
  similarityController.checkProposalSimilarity
);

// Get recommendations for a project
router.get('/recommend/:projectId', similarityController.getRecommendations);

module.exports = router;
