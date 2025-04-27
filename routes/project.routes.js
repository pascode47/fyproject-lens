const express = require('express');
const { projectController } = require('../controllers');
const { auth, upload } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/', projectController.getProjects);
router.get('/statistics', projectController.getStatistics);
router.get('/activities', projectController.getRecentActivities);
router.get('/:id', projectController.getProject);

// Protected routes
router.post(
  '/upload',
  auth.protect,
  upload.uploadDocx,
  upload.handleUploadError,
  projectController.uploadProject
);

// Admin only routes
router.delete(
  '/:id',
  auth.protect,
  auth.authorize('admin'),
  projectController.deleteProject
);

router.post(
  '/bulk',
  auth.protect,
  auth.authorize('admin'),
  upload.uploadCsv,
  upload.handleUploadError,
  projectController.bulkUpload
);

module.exports = router;
