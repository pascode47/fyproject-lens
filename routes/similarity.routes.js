const express = require('express');
const { similarityController } = require('../controllers');
const { auth } = require('../middleware');

const router = express.Router();

// All routes are protected
router.use(auth.protect);

// Get similarity results for a project
router.get('/:projectId', similarityController.getSimilarityResults);

// Analyze a project for similarities
router.post('/analyze', similarityController.analyzeSimilarity);

// Get recommendations for a project
router.get('/recommend/:projectId', similarityController.getRecommendations);

module.exports = router;
