const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const appraisalRoutes = require('./appraisals');
const updatePendingAppraisalRoutes = require('./updatePendingAppraisal');

router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingAppraisalRoutes);

module.exports = router;