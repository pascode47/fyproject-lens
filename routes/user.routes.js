const express = require('express');
const { userController } = require('../controllers');
const { auth } = require('../middleware');

const router = express.Router();

// Profile routes (protected)
router.get('/profile', auth.protect, userController.getProfile);
router.get('/profile/history', auth.protect, userController.getAnalysisHistory);

// Admin routes (protected and admin only)
router.get(
  '/admin/users',
  auth.protect,
  auth.authorize('admin'),
  userController.getUsers
);

router.get(
  '/admin/users/:id',
  auth.protect,
  auth.authorize('admin'),
  userController.getUser
);

router.patch(
  '/admin/users/:id/status',
  auth.protect,
  auth.authorize('admin'),
  userController.updateUserStatus
);

router.delete(
  '/admin/users/:id',
  auth.protect,
  auth.authorize('admin'),
  userController.deleteUser
);

router.get(
  '/admin/analytics',
  auth.protect,
  auth.authorize('admin'),
  userController.getAnalytics
);

module.exports = router;
