// API Routes
const API_ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    GOOGLE: '/api/auth/google'
  },

  // Appraisal routes
  APPRAISALS: {
    BASE: '/api/appraisals',
    COMPLETED: '/api/appraisals/completed',
    DETAILS: (id) => `/api/appraisals/${id}/list`,
    DETAILS_EDIT: (id) => `/api/appraisals/${id}/list-edit`,
    SET_VALUE: (id) => `/api/appraisals/${id}/set-value`,
    MERGE_DESCRIPTIONS: (id) => `/api/appraisals/${id}/merge-descriptions`,
    UPDATE_TITLE: (id) => `/api/appraisals/${id}/update-title`,
    INSERT_TEMPLATE: (id) => `/api/appraisals/${id}/insert-template`,
    BUILD_PDF: (id) => `/api/appraisals/${id}/build-pdf`,
    SEND_EMAIL: (id) => `/api/appraisals/${id}/send-email`,
    COMPLETE: (id) => `/api/appraisals/${id}/complete`,
    COMPLETE_PROCESS: (id) => `/api/appraisals/${id}/complete-process`,
    PROCESS_WORKER: '/api/appraisals/process-worker'
  },

  // Update pending appraisal route
  UPDATE_PENDING: '/api/update-pending-appraisal'
};

// Validate routes are unique
const allRoutes = [
  ...Object.values(API_ROUTES.AUTH),
  ...Object.values(API_ROUTES.APPRAISALS)
    .filter(route => typeof route === 'string'),
  API_ROUTES.UPDATE_PENDING
];

const duplicates = allRoutes.filter((route, index) => 
  allRoutes.indexOf(route) !== index
);

if (duplicates.length > 0) {
  throw new Error(`Duplicate routes found: ${duplicates.join(', ')}`);
}

module.exports = {
  API_ROUTES
};