const express = require('express');
const router = express.Router();

const appraisalRoutes = require('./appraisal.routes');
const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');
const updatePendingRoutes = require('./updatePending.routes');
const appraisalStepsRoutes = require('./appraisal.steps');

router.use('/appraisals', appraisalRoutes);
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/appraisals', appraisalStepsRoutes);
router.use('/update-pending', updatePendingRoutes);

module.exports = router;