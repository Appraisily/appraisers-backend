// API Routes
const API_ROUTES = {
  AUTH: {
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    REFRESH: 'auth/refresh',
    GOOGLE: 'auth/google'
  },
  APPRAISALS: {
    BASE: 'appraisals',
    COMPLETED: 'appraisals/completed',
    DETAILS: 'appraisals/:id/list',
    DETAILS_EDIT: 'appraisals/:id/list-edit',
    SET_VALUE: 'appraisals/:id/set-value',
    MERGE_DESCRIPTIONS: 'appraisals/:id/merge-descriptions',
    GENERATE_PDF: 'appraisals/:id/generate-pdf',
    COMPLETE_PROCESS: 'appraisals/:id/complete-process',
    SEND_EMAIL: 'appraisals/:id/send-email'
  },
  UPDATE_PENDING: 'update-pending-appraisal'
};

// Route helpers
const routeHelpers = {
  getFullPath: (route) => `/api/${route.replace(/^\/+/, '')}`,
  validatePath: (path) => {
    const normalizedPath = path
      .replace(/^\/+|\/+$/g, '')
      .replace(/:\w+/g, ':id');
    
    return Object.values(API_ROUTES).some(group => {
      if (typeof group === 'string') {
        return group.replace(/:\w+/g, ':id') === normalizedPath;
      }
      return Object.values(group).some(route => 
        route.replace(/:\w+/g, ':id') === normalizedPath
      );
    });
  },
  withId: (route, id) => route.replace(':id', id),
  appraisalRoute: (route, id) => `/api/appraisals/${route.replace(':id', id)}`,
};

module.exports = { 
  API_ROUTES,
  routeHelpers
};