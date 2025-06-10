const express = require('express');
const authRoutes = require('./auth.routes');
const programmeRoutes = require('./programme.routes');
const projectRoutes = require('./project.routes');
const similarityRoutes = require('./similarity.routes');
const userRoutes = require('./user.routes');
const ideaRoutes = require('./idea.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/programmes', programmeRoutes);
router.use('/projects', projectRoutes);
router.use('/similarity', similarityRoutes);
router.use('/ideas', ideaRoutes);
router.use('/', userRoutes); // User routes include /profile and /admin paths

module.exports = router;
