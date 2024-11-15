const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    GOOGLE: '/api/auth/google'
  },
  APPRAISALS: {
    BASE: '/api/appraisals',
    COMPLETED: '/api/appraisals/completed',
    DETAILS: '/api/appraisals/:id/list',
    DETAILS_EDIT: '/api/appraisals/:id/list-edit',
    SET_VALUE: '/api/appraisals/:id/set-value',
    MERGE_DESCRIPTIONS: '/api/appraisals/:id/merge-descriptions',
    UPDATE_TITLE: '/api/appraisals/:id/update-title',
    INSERT_TEMPLATE: '/api/appraisals/:id/insert-template',
    BUILD_PDF: '/api/appraisals/:id/build-pdf',
    SEND_EMAIL: '/api/appraisals/:id/send-email',
    COMPLETE: '/api/appraisals/:id/complete',
    COMPLETE_PROCESS: '/api/appraisals/:id/complete-process',
    PROCESS_WORKER: '/api/appraisals/process-worker'
  },
  UPDATE_PENDING: '/api/update-pending-appraisal'
};

// Validate routes are unique
const allRoutes = [
  ...Object.values(API_ROUTES.AUTH),
  ...Object.values(API_ROUTES.APPRAISALS),
  API_ROUTES.UPDATE_PENDING
];

const duplicates = allRoutes.filter((route, index) => 
  allRoutes.indexOf(route) !== index
);

if (duplicates.length > 0) {
  throw new Error(`Duplicate routes found: ${duplicates.join(', ')}`);
}

module.exports = { API_ROUTES };