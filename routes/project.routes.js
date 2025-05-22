const express = require('express');
const { projectController } = require('../controllers');
const { auth, upload } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/', projectController.getProjects); // Consider if this should be getProjectsByFilter now? Or keep separate? Keeping separate for now.
router.get('/statistics', projectController.getStatistics);
router.get('/activities', projectController.getRecentActivities);
router.get('/years', projectController.getAcademicYears); // Keep route for distinct years
router.get('/year/:year', projectController.getProjectsByYear); // New route for projects by year
// Removed /courses/:year and /filter routes
router.get('/:id', projectController.getProject); // Keep specific project fetch
router.get('/:id/download', projectController.downloadProjectReport); // Add download route

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
