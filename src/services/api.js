const axios = require('axios');

const api = axios.create({
  baseURL: 'https://appraisers-backend-856401495068.us-central1.run.app',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor for requests
api.interceptors.request.use(
  (config) => {
    // No need to manually set Authorization header
    // Cookies will be sent automatically with withCredentials: true
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await api.post('/api/auth/refresh');
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, just return the error
        return Promise.reject(new Error('Session expired. Authentication required.'));
      }
    }

    return Promise.reject(error);
  }
);

module.exports = api;