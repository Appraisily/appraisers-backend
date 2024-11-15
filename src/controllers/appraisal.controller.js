const { 
  sheetsService, 
  wordpressService, 
  openaiService, 
  emailService,
  pubsubService 
} = require('../services');
const { config } = require('../config');
const { getImageUrl } = require('../utils/getImageUrl');

class AppraisalController {
  // ... all the existing methods ...
}

// Export the class methods individually
module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompletedAppraisals: AppraisalController.getCompletedAppraisals,
  getAppraisalDetails: AppraisalController.getAppraisalDetails,
  getAppraisalDetailsForEdit: AppraisalController.getAppraisalDetailsForEdit,
  updateAcfField: AppraisalController.updateAcfField,
  setAppraisalValue: AppraisalController.setAppraisalValue,
  completeProcess: AppraisalController.completeProcess,
  processWorker: AppraisalController.processWorker,
  getSessionId: AppraisalController.getSessionId,
  saveLinks: AppraisalController.saveLinks,
  updateLinks: AppraisalController.updateLinks,
  insertTemplate: AppraisalController.insertTemplate,
  updatePostTitle: AppraisalController.updatePostTitle,
  sendEmailToCustomer: AppraisalController.sendEmailToCustomer,
  completeAppraisal: AppraisalController.completeAppraisal
};