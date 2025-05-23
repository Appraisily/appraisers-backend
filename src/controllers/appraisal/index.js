const AppraisalListController = require('./list.controller');
const AppraisalDetailsController = require('./details.controller');
const AppraisalValueController = require('./value.controller');
const WordPressController = require('./wordpress.controller');
const BulkController = require('./bulk.controller');
const DetailsController = require('./details.controller');
const ValueController = require('./value.controller');
const ImageAnalysisController = require('./imageAnalysis.controller');
const ReprocessController = require('./reprocess.controller');

module.exports = {
  getAppraisals: AppraisalListController.getAppraisals,
  getCompletedAppraisals: AppraisalListController.getCompletedAppraisals,
  cleanupMovedToCompleted: AppraisalListController.cleanupMovedToCompleted,
  removeAppraisal: AppraisalListController.removeAppraisal,
  movePendingToCompleted: AppraisalListController.movePendingToCompleted,
  getDetails: AppraisalDetailsController.getDetails,
  getDetailsForEdit: AppraisalDetailsController.getDetailsForEdit,
  setValue: AppraisalValueController.setValue,
  proposeValue: AppraisalValueController.proposeValue,
  completeProcess: AppraisalValueController.completeProcess,
  updateAcfField: WordPressController.updateAcfField,
  getSessionId: WordPressController.getSessionId,
  saveLinks: WordPressController.saveLinks,
  updateLinks: WordPressController.updateLinks,
  reprocessWithGeminiData: ReprocessController.reprocessWithGeminiData,
  BulkController,
  DetailsController,
  ValueController,
  WordPressController,
  ImageAnalysisController,
  ReprocessController,
};