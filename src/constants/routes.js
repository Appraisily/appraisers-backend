/**
 * API route definitions
 * All routes must be defined here to be considered valid
 */
const API_ROUTES = {
  AUTH: {
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    REFRESH: 'auth/refresh'
  },
  APPRAISALS: {
    BASE: 'appraisals',
    LIST: 'appraisals',
    COMPLETED: 'appraisals/completed',
    CLEANUP_MOVED: 'appraisals/cleanup-moved-completed',
    DETAILS: (id) => `appraisals/${id}/list`,
    DETAILS_EDIT: (id) => `appraisals/${id}/list-edit`,
    SET_VALUE: (id) => `appraisals/${id}/set-value`,
    COMPLETE_PROCESS: (id) => `appraisals/${id}/complete-process`,
    MOVE_TO_COMPLETED: (id) => `appraisals/${id}/move-to-completed`,
    PROCESS_WORKER: 'appraisals/process-worker'
  },
  UPDATE_PENDING: {
    BASE: 'update-pending-appraisal',
    CREATE: 'update-pending-appraisal'
  }
};

module.exports = { API_ROUTES };