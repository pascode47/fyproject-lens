const express = require('express');
const { programmeController } = require('../controllers');
const { auth } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/', programmeController.getProgrammes);
router.get('/:id', programmeController.getProgramme);

// Admin only routes
router.post(
  '/',
  auth.protect,
  auth.authorize('admin'),
  programmeController.createProgramme
);

router.put(
  '/:id',
  auth.protect,
  auth.authorize('admin'),
  programmeController.updateProgramme
);

router.delete(
  '/:id',
  auth.protect,
  auth.authorize('admin'),
  programmeController.deleteProgramme
);

module.exports = router;
