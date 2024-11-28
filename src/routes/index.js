const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingRoutes = require('./updatePending.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingRoutes);

module.exports = router;