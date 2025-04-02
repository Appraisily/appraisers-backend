const express = require('express');
const router = express.Router();

const appraisalRoutes = require('./appraisal.routes');
const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');
const updatePendingRoutes = require('./updatePending.routes');
const appraisalStepsRoutes = require('./appraisal.steps');

router.use('/api/appraisals', appraisalRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/health', healthRoutes);
router.use('/api/appraisals', appraisalStepsRoutes);
router.use('/api/update-pending', updatePendingRoutes);

module.exports = router;