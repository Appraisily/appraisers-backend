const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const AppraisalController = require('../controllers/appraisal');
const BulkController = require('../controllers/appraisal/bulk.controller');
const DetailsController = require('../controllers/appraisal/details.controller');
const { registerRoute } = require('../services/routeDecorator');

// List and View routes
registerRoute(router, 'get', '/', {
  description: 'Get a list of all appraisals',
  parameters: {},
  response: {
    success: true,
    data: {
      appraisals: [
        {
          id: 'appraisal123',
          title: 'Example Appraisal',
          status: 'pending',
          createdAt: '2023-01-01T00:00:00Z'
        }
      ]
    }
  }
}, authenticate, AppraisalController.getAppraisals);

registerRoute(router, 'get', '/completed', {
  description: 'Get a list of completed appraisals',
  parameters: {},
  response: {
    success: true,
    data: {
      appraisals: [
        {
          id: 'appraisal123',
          title: 'Example Completed Appraisal',
          status: 'completed',
          completedAt: '2023-01-02T00:00:00Z',
          createdAt: '2023-01-01T00:00:00Z'
        }
      ]
    }
  }
}, authenticate, AppraisalController.getCompletedAppraisals);

registerRoute(router, 'get', '/:id/list', {
  description: 'Get detailed information about a specific appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    data: {
      appraisal: {
        id: 'appraisal123',
        title: 'Example Appraisal',
        description: 'Detailed description',
        items: [],
        status: 'pending'
      }
    }
  }
}, authenticate, AppraisalController.getDetails);

registerRoute(router, 'get', '/:id/list-edit', {
  description: 'Get detailed information about a specific appraisal for editing',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    data: {
      appraisal: {
        id: 'appraisal123',
        title: 'Example Appraisal',
        description: 'Detailed description',
        items: [],
        status: 'pending',
        editable: true
      }
    }
  }
}, authenticate, AppraisalController.getDetailsForEdit);

registerRoute(router, 'get', '/:id/bulk-images', {
  description: 'Get bulk images associated with an appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    data: {
      images: [
        {
          url: 'https://example.com/image1.jpg',
          name: 'image1.jpg'
        }
      ]
    }
  }
}, authenticate, BulkController.getBulkImages);

registerRoute(router, 'post', '/:id/process-bulk', {
  description: 'Process bulk images for an appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  requestBody: {
    imageIds: ['image1', 'image2']
  },
  response: {
    success: true,
    message: 'Bulk images processed successfully'
  }
}, authenticate, BulkController.processBulkImages);

// Value proposal route
registerRoute(router, 'post', '/propose-value', {
  description: 'Propose a value for an appraisal',
  requestBody: {
    appraisalId: 'appraisal123',
    proposedValue: 500.00,
    currency: 'USD',
    notes: 'Optional notes about the valuation'
  },
  response: {
    success: true,
    data: {
      proposedValue: 500.00,
      currency: 'USD'
    }
  }
}, authenticate, AppraisalController.proposeValue);

// Process routes
registerRoute(router, 'post', '/:id/set-value', {
  description: 'Set the final value for an appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  requestBody: {
    value: 500.00,
    currency: 'USD',
    notes: 'Optional notes about the final valuation'
  },
  response: {
    success: true,
    message: 'Value set successfully'
  }
}, authenticate, validateSetValue, AppraisalController.setValue);

registerRoute(router, 'post', '/:id/complete-process', {
  description: 'Mark an appraisal as complete',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  requestBody: {
    notes: 'Optional completion notes'
  },
  response: {
    success: true,
    message: 'Appraisal marked as complete'
  }
}, authenticate, AppraisalController.completeProcess);

// New routes for completed appraisal details and step reprocessing
registerRoute(router, 'get', '/:id/details', {
  description: 'Get detailed information about a completed appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    appraisalDetails: {
      id: 'appraisal123',
      postId: '456',
      title: 'Example Completed Appraisal',
      steps: [
        {
          name: 'enhance_description',
          status: 'completed',
          timestamp: '2023-01-02T00:00:00Z'
        }
      ]
    }
  }
}, authenticate, DetailsController.getCompletedAppraisalDetails);

registerRoute(router, 'post', '/:id/reprocess-step', {
  description: 'Reprocess a specific step of an appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  requestBody: {
    stepName: 'enhance_description'
  },
  response: {
    success: true,
    message: 'Step reprocessed successfully',
    result: {
      stepName: 'enhance_description',
      status: 'completed',
      timestamp: '2023-01-02T00:00:00Z'
    }
  }
}, authenticate, DetailsController.reprocessAppraisalStep);

module.exports = router;