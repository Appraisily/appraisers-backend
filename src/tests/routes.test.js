const request = require('supertest');
const app = require('../app');
const { API_ROUTES } = require('../constants/routes');

describe('API Routes', () => {
  // Auth routes
  describe('Auth Routes', () => {
    test('POST /api/auth/login should exist', async () => {
      const res = await request(app).post(API_ROUTES.AUTH.LOGIN);
      expect(res.status).not.toBe(404);
    });

    test('POST /api/auth/logout should exist', async () => {
      const res = await request(app).post(API_ROUTES.AUTH.LOGOUT);
      expect(res.status).not.toBe(404);
    });

    test('POST /api/auth/refresh should exist', async () => {
      const res = await request(app).post(API_ROUTES.AUTH.REFRESH);
      expect(res.status).not.toBe(404);
    });
  });

  // Appraisal routes
  describe('Appraisal Routes', () => {
    test('GET /api/appraisals should exist', async () => {
      const res = await request(app).get(API_ROUTES.APPRAISALS.BASE);
      expect(res.status).not.toBe(404);
    });

    test('GET /api/appraisals/completed should exist', async () => {
      const res = await request(app).get(API_ROUTES.APPRAISALS.COMPLETED);
      expect(res.status).not.toBe(404);
    });

    // Test dynamic routes with sample ID
    const sampleId = '123';
    
    test('GET /api/appraisals/:id/list should exist', async () => {
      const res = await request(app).get(API_ROUTES.APPRAISALS.DETAILS(sampleId));
      expect(res.status).not.toBe(404);
    });

    test('POST /api/appraisals/:id/complete-process should exist', async () => {
      const res = await request(app).post(API_ROUTES.APPRAISALS.COMPLETE_PROCESS(sampleId));
      expect(res.status).not.toBe(404);
    });

    test('POST /api/appraisals/:id/update-acf-field should exist', async () => {
      const res = await request(app).post(`/api/appraisals/${sampleId}/update-acf-field`);
      expect(res.status).not.toBe(404);
    });

    test('GET /api/appraisals/get-session-id should exist', async () => {
      const res = await request(app).get('/api/appraisals/get-session-id');
      expect(res.status).not.toBe(404);
    });

    test('POST /api/appraisals/:id/save-links should exist', async () => {
      const res = await request(app).post(`/api/appraisals/${sampleId}/save-links`);
      expect(res.status).not.toBe(404);
    });

    test('POST /api/appraisals/:id/update-links should exist', async () => {
      const res = await request(app).post(`/api/appraisals/${sampleId}/update-links`);
      expect(res.status).not.toBe(404);
    });
  });

  // Update pending route
  describe('Update Pending Route', () => {
    test('POST /api/update-pending-appraisal should exist', async () => {
      const res = await request(app).post(API_ROUTES.UPDATE_PENDING);
      expect(res.status).not.toBe(404);
    });
  });
});