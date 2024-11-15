const authController = require('./auth/auth.controller');
const appraisalController = require('./appraisal/appraisal.controller');
const updatePendingController = require('./appraisal/updatePending.controller');

module.exports = {
  authController,
  appraisalController,
  updatePendingController
};