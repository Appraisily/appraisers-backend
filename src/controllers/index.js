const authController = require('./auth/auth.controller');
const appraisalController = require('./appraisal');
const updatePendingController = require('./updatePendingAppraisal.controller');

module.exports = {
  authController,
  appraisalController,
  updatePendingController
};