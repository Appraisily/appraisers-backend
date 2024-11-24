const API_ROUTES = {
  AUTH: {
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    REFRESH: 'auth/refresh'
  },
  APPRAISALS: {
    LIST: 'appraisals',
    COMPLETED: 'appraisals/completed',
    DETAILS: 'appraisals/:id/list',
    DETAILS_EDIT: 'appraisals/:id/list-edit',
    SET_VALUE: 'appraisals/:id/set-value',
    COMPLETE_PROCESS: 'appraisals/:id/complete-process',
    PROCESS_WORKER: 'appraisals/process-worker',
    UPDATE_PENDING: 'update-pending-appraisal'
  }
};

const routeHelpers = {
  getFullPath: (route) => `/api/${route.replace(/^\/+/, '')}`,
  withId: (route, id) => route.replace(':id', id),
  validatePath: (path) => {
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');
    return Object.values(API_ROUTES).some(group => 
      Object.values(group).includes(normalizedPath)
    );
  }
};

module.exports = { 
  API_ROUTES,
  routeHelpers
};