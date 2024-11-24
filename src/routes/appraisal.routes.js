const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { API_ROUTES } = require('../constants/routes');
const { 
  getAppraisals,
  getCompleted,
  getDetails,
  getDetailsForEdit,
  setValue,
  processWorker,
  completeProcess
} = require('../controllers/appraisal/appraisal.controller');

// List and View routes
router.get('/', authenticate, getAppraisals);
router.get('/completed', authenticate, getCompleted);
router.get('/:id/list', authenticate, getDetails);
router.get('/:id/list-edit', authenticate, getDetailsForEdit);

// Value update route
router.post('/:id/set-value', authenticate, setValue);

// Process route - only publishes to PubSub
router.post('/:id/complete-process', authenticate, completeProcess);

// Worker route
router.post('/process-worker', authenticate, processWorker);

module.exports = router;