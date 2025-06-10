const express = require('express');
const { ideaController } = require('../controllers');
const { auth } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/', ideaController.getIdeas);
router.get('/random', ideaController.getRandomIdeas);
router.get('/categories', ideaController.getCategories);
router.get('/:category', ideaController.getIdeasByCategory);

// Admin only routes
router.post(
  '/',
  auth.protect,
  auth.authorize('admin'),
  ideaController.createIdea
);

router.put(
  '/:id',
  auth.protect,
  auth.authorize('admin'),
  ideaController.updateIdea
);

router.delete(
  '/:id',
  auth.protect,
  auth.authorize('admin'),
  ideaController.deleteIdea
);

module.exports = router;
