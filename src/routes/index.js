const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingRoutes = require('./updatePending.routes');
const healthRoutes = require('./health.routes');

// Mount routes with proper prefixes
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingRoutes);
router.use('/health', healthRoutes);

// Log mounted routes
console.log('✓ Routes mounted:');
console.log('  - /api/auth/*');
console.log('  - /api/appraisals/*');
console.log('  - /api/update-pending-appraisal');
console.log('  - /api/health/*');

module.exports = router;