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
router.use('/update-pending-appraisal', updatePendingRoutes);

// Validate routes
try {
  RouteValidator.validateRoutes(router);
  console.log('✓ Routes initialized successfully');
} catch (error) {
  console.error('❌ Route initialization failed:', error.message);
  process.exit(1);
}

module.exports = router;