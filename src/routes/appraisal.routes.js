const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const AppraisalController = require('../controllers/appraisal');
const BulkController = require('../controllers/appraisal/bulk.controller');
const DetailsController = require('../controllers/appraisal/details.controller');
const { ImageAnalysisController } = require('../controllers/appraisal');
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

// New endpoint for complete reprocessing
registerRoute(router, 'post', '/:id/reprocess-completed', {
  description: 'Reprocess an entire completed appraisal',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    message: 'Appraisal submitted for complete reprocessing',
    details: {
      id: 'appraisal123',
      postId: '456',
      service: 'appraisals-backend',
      status: 'processing',
      timestamp: '2023-01-02T00:00:00Z'
    }
  }
}, authenticate, DetailsController.reprocessCompleteAppraisal);

// New route for sending confirmation emails
registerRoute(router, 'post', '/:id/send-confirmation-email', {
  description: 'Sends a confirmation email to the customer with appraisal details',
  parameters: {
    id: {
      description: 'Appraisal ID',
      required: true
    }
  },
  response: {
    success: true,
    message: 'Confirmation email sent successfully',
    details: {
      id: 'appraisal123',
      emailSent: true,
      timestamp: '2023-01-02T00:00:00Z'
    }
  }
}, authenticate, DetailsController.sendConfirmationEmail);

// AI image analysis and description merging
registerRoute(router, 'post', '/analyze-image-and-merge', {
  description: 'Analyze image with GPT-4o and merge descriptions',
  requestBody: {
    id: 'String - Appraisal ID',
    postId: 'String - WordPress post ID',
    description: 'String - Customer description (optional)'
  },
  response: {
    success: true,
    message: 'Request to analyze image has been submitted',
    timestamp: '2023-01-02T00:00:00Z'
  }
}, authenticate, ImageAnalysisController.analyzeImageAndMergeDescriptions);

// New route for cleaning up moved to completed entries
registerRoute(router, 'post', '/cleanup-moved-completed', {
  description: 'Clean up entries with "Moved to Completed" status from the pending appraisals list',
  parameters: {},
  response: {
    success: true,
    message: 'Successfully cleaned up moved to completed entries',
    cleanedCount: 5
  }
}, authenticate, AppraisalController.cleanupMovedToCompleted);

// New route for reprocessing with Gemini data
registerRoute(router, 'post', '/reprocess-with-gemini', {
  description: 'Reprocess an appraisal with data from Gemini AI analysis',
  requestBody: {
    postId: 'String - WordPress post ID',
    sessionId: 'String - Original Stripe session ID',
    appraisalValue: 'Number - The appraised value from Gemini',
    description: 'String - The description generated by Gemini',
    appraisalType: 'String - Appraisal type (IRS, Insurance, etc.)'
  },
  response: {
    success: true,
    message: 'Appraisal reprocessing started successfully'
  }
}, authenticate, AppraisalController.reprocessWithGeminiData);

module.exports = router;