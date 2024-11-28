const express = require('express');
const router = express.Router();
const RouteValidator = require('../middleware/routeValidator');

// Import route modules
const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingRoutes = require('./updatePending.routes');

// Mount routes with proper prefixes
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/', updatePendingRoutes);

// Validate all routes
RouteValidator.validateRoutes(router);

module.exports = router;