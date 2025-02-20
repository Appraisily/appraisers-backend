const AppraisalListController = require('./list.controller');
const AppraisalDetailsController = require('./details.controller');
const AppraisalValueController = require('./value.controller');
const WordPressController = require('./wordpress.controller');

module.exports = {
  getAppraisals: AppraisalListController.getAppraisals,
  getCompletedAppraisals: AppraisalListController.getCompletedAppraisals,
  getDetails: AppraisalDetailsController.getDetails,
  getDetailsForEdit: AppraisalDetailsController.getDetailsForEdit,
  setValue: AppraisalValueController.setValue,
  proposeValue: AppraisalValueController.proposeValue,
  completeProcess: AppraisalValueController.completeProcess,
  updateAcfField: WordPressController.updateAcfField,
  getSessionId: WordPressController.getSessionId,
  saveLinks: WordPressController.saveLinks,
  updateLinks: WordPressController.updateLinks
};