const { 
  openaiService, 
  sheetsService, 
  emailService, 
  wordpressService 
} = require('../services');
const { config } = require('../config');

class UpdatePendingAppraisalController {
  // ... all the existing methods ...
}

// Export the class methods individually
module.exports = {
  updatePendingAppraisal: UpdatePendingAppraisalController.updatePendingAppraisal
};