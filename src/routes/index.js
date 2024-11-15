const express = require('express');
const router = express.Router();
const RouteValidator = require('../middleware/routeValidator');

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingAppraisalRoutes);

// Validate routes
RouteValidator.validateRoutes(router);

module.exports = router;