const express = require('express');
const router = express.Router();
const validateRoutes = require('../middleware/validateRoutes');

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal.routes');

// Mount routes directly without /api prefix
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingAppraisalRoutes);

// Validate all routes after mounting
validateRoutes(router);

module.exports = router;