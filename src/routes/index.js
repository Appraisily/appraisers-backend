const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingRoutes = require('./updatePending.routes');

// Mount routes with proper prefixes
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingRoutes);

// Log mounted routes
console.log('✓ Routes mounted:');
console.log('  - /api/auth/*');
console.log('  - /api/appraisals/*');
console.log('  - /api/update-pending-appraisal');

module.exports = router;