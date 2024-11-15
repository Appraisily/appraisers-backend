const express = require('express');
const router = express.Router();
const validateRoutes = require('../middleware/validateRoutes');

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal.routes');

// Mount routes without /api prefix as it's added in validateRoutes
router.use('/auth', validateRoutes(authRoutes));
router.use('/appraisals', validateRoutes(appraisalRoutes));
router.use('/update-pending-appraisal', validateRoutes(updatePendingAppraisalRoutes));

module.exports = router;