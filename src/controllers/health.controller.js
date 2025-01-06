const { version } = require('../../package.json');
const { API_ROUTES } = require('../constants/routes');

class HealthController {
  static async getEndpoints(req, res) {
    const endpoints = [
      {
        path: '/api/auth/login',
        method: 'POST',
        description: 'User authentication',
        requiredParams: ['email', 'password'],
        response: {
          success: true,
          name: 'Appraisily Admin',
          message: 'Login successful'
        }
      },
      {
        path: '/api/auth/google',
        method: 'POST',
        description: 'Google Sign-In authentication',
        requiredParams: ['credential'],
        response: {
          success: true,
          name: 'Google User Name'
        }
      },
      {
        path: '/api/auth/refresh',
        method: 'POST',
        description: 'Refresh JWT token',
        requiredParams: [],
        response: {
          success: true,
          message: 'Token refreshed successfully'
        }
      },
      {
        path: '/api/auth/logout',
        method: 'POST',
        description: 'User logout',
        requiredParams: [],
        response: {
          success: true,
          message: 'Logout successful'
        }
      },
      {
        path: '/api/appraisals',
        method: 'GET',
        description: 'List pending appraisals',
        requiredParams: [],
        response: [{
          id: 2,
          date: '2023-12-01',
          appraisalType: 'RegularArt',
          identifier: 'ABC123',
          status: 'Pending',
          wordpressUrl: 'https://example.com/post/123',
          iaDescription: 'Sample description'
        }]
      },
      {
        path: '/api/appraisals/completed',
        method: 'GET',
        description: 'List completed appraisals',
        requiredParams: [],
        response: [{
          id: 3,
          date: '2023-12-01',
          appraisalType: 'PremiumArt',
          identifier: 'XYZ789',
          status: 'Completed',
          wordpressUrl: 'https://example.com/post/456',
          iaDescription: 'Sample completed description'
        }]
      },
      {
        path: '/api/appraisals/:id/list',
        method: 'GET',
        description: 'Get appraisal details',
        requiredParams: ['id'],
        response: {
          id: '123',
          date: '2023-12-01',
          appraisalType: 'RegularArt',
          identifier: 'ABC123',
          customerEmail: 'customer@example.com',
          customerName: 'John Doe',
          status: 'Pending',
          wordpressUrl: 'https://example.com/post/123',
          iaDescription: 'AI generated description',
          customerDescription: 'Customer provided description',
          images: {
            main: 'https://example.com/main.jpg',
            age: 'https://example.com/age.jpg',
            signature: 'https://example.com/signature.jpg'
          }
        }
      },
      {
        path: '/api/appraisals/:id/list-edit',
        method: 'GET',
        description: 'Get appraisal details for editing',
        requiredParams: ['id'],
        response: {
          id: '123',
          date: '2023-12-01',
          appraisalType: 'RegularArt',
          identifier: 'ABC123',
          status: 'Pending',
          wordpressUrl: 'https://example.com/post/123',
          iaDescription: 'AI description',
          customerDescription: 'Customer description',
          acfFields: {
            value: '1000',
            main: 'image_id',
            age: 'image_id',
            signature: 'image_id'
          }
        }
      },
      {
        path: '/api/appraisals/:id/set-value',
        method: 'POST',
        description: 'Set appraisal value',
        requiredParams: ['id', 'appraisalValue', 'description'],
        response: {
          success: true,
          message: 'Appraisal value set successfully'
        }
      },
      {
        path: '/api/appraisals/:id/complete-process',
        method: 'POST',
        description: 'Start appraisal processing',
        requiredParams: ['id', 'appraisalValue', 'description'],
        response: {
          success: true,
          message: 'Appraisal process started successfully'
        }
      },
      {
        path: '/api/update-pending-appraisal',
        method: 'POST',
        description: 'Update pending appraisal with new data',
        requiredParams: ['session_id', 'customer_email', 'post_id', 'images'],
        response: {
          success: true,
          message: 'Appraisal status update initiated'
        }
      }
    ];

    res.json({
      service: 'appraisers-backend',
      version,
      endpoints
    });
  }

  static async getStatus(req, res) {
    const services = {
      wordpress: true,
      sheets: true,
      email: true,
      ai: true,
      pubsub: true
    };

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services
    });
  }
}

module.exports = HealthController;