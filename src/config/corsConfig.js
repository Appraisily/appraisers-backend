const { config } = require('../config');

// Default URLs for local development
const taskQueueUrl = 'https://appraisers-task-queue-856401495068.us-central1.run.app';
const appraisalsBackendUrl = 'https://appraisers-backend-856401495068.us-central1.run.app';

// Function to extract domains from URLs
function extractDomain(url) {
  try {
    if (!url) return null;
    const domain = new URL(url).origin;
    return domain;
  } catch (error) {
    console.warn(`Failed to parse URL: ${url}`);
    return null;
  }
}

const allowedOrigins = [
  // Frontend origins
  'https://earnest-choux-a0ec16.netlify.app',
  'https://jazzy-lollipop-0a3217.netlify.app',
  'https://lucent-nasturtium-01c2b7.netlify.app',
  'https://appraisers-frontend-856401495068.us-central1.run.app',
  'https://appraisers.appraisily.com',
  
  // WebContainer origins
  '.webcontainer-api.io',
  'stackblitz.com',
  
  // Backend origins
  'https://michelle-gmail-856401495068.us-central1.run.app',
  extractDomain(config?.TASK_QUEUE_URL) || taskQueueUrl,
  extractDomain(config?.APPRAISALS_BACKEND_URL) || appraisalsBackendUrl,
  
  // Development origins
  'http://localhost:3000',
  'http://localhost:8080'
].filter(Boolean); // Remove any null values

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, workers or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Check for WebContainer domains
    if (origin.endsWith('.webcontainer-api.io') || origin.includes('stackblitz')) {
      callback(null, true);
      return;
    }

    console.log('❌ [CORS] Blocked request from origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'x-shared-secret'
  ],
  exposedHeaders: ['Set-Cookie']
};

module.exports = { corsOptions };