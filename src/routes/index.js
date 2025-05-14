const express = require('express');
const router = express.Router();

const appraisalRoutes = require('./appraisal.routes');
const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');
const updatePendingRoutes = require('./updatePending.routes');
const appraisalStepsRoutes = require('./appraisal.steps');
const pdfRoutes = require('./pdf');
const geminiRoutes = require('./gemini.routes');

router.use('/appraisals', appraisalRoutes);
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/appraisals', appraisalStepsRoutes);
router.use('/update-pending', updatePendingRoutes);
router.use('/pdf', pdfRoutes);
router.use('/generate-gemini-doc', geminiRoutes);

module.exports = router;