const express = require('express');
const router = express.Router();
const validateRoutes = require('../middleware/validateRoutes');

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal.routes');

// Validate and mount routes
router.use('/auth', validateRoutes(authRoutes));
router.use('/appraisals', validateRoutes(appraisalRoutes));
router.use('/update-pending-appraisal', validateRoutes(updatePendingAppraisalRoutes));

module.exports = router;