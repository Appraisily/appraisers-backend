const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const appraisalRoutes = require('./appraisal.routes');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal.routes');

router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingAppraisalRoutes);

module.exports = router;