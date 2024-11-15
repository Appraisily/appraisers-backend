const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    GOOGLE: '/auth/google'
  },
  APPRAISALS: {
    BASE: '/appraisals',
    COMPLETED: '/appraisals/completed',
    DETAILS: '/appraisals/:id/list',
    DETAILS_EDIT: '/appraisals/:id/list-edit',
    SET_VALUE: '/appraisals/:id/set-value',
    MERGE_DESCRIPTIONS: '/appraisals/:id/merge-descriptions',
    UPDATE_TITLE: '/appraisals/:id/update-title',
    INSERT_TEMPLATE: '/appraisals/:id/insert-template',
    BUILD_PDF: '/appraisals/:id/build-pdf',
    SEND_EMAIL: '/appraisals/:id/send-email',
    COMPLETE: '/appraisals/:id/complete',
    COMPLETE_PROCESS: '/appraisals/:id/complete-process',
    PROCESS_WORKER: '/appraisals/process-worker',
    UPDATE_ACF_FIELD: '/appraisals/:id/update-acf-field',
    GET_SESSION_ID: '/appraisals/get-session-id',
    SAVE_LINKS: '/appraisals/:id/save-links',
    UPDATE_LINKS: '/appraisals/:id/update-links'
  },
  UPDATE_PENDING: '/update-pending-appraisal'
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

// Add route helpers
const routeHelpers = {
  getFullPath: (route) => `/api${route}`,
  validatePath: (path) => {
    const normalizedPath = path.replace(/^\/api/, '');
    return allRoutes.some(route => 
      route.replace(/:\w+/g, ':id') === normalizedPath.replace(/:\w+/g, ':id')
    );
  }
};

module.exports = { 
  API_ROUTES,
  routeHelpers
};