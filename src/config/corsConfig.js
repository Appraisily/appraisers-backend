const allowedOrigins = [
  // Frontend origins
  'https://earnest-choux-a0ec16.netlify.app',
  'https://jazzy-lollipop-0a3217.netlify.app',
  'https://lucent-nasturtium-01c2b7.netlify.app',
  'https://appraisers-frontend-856401495068.us-central1.run.app',
  'https://appraisers.appraisily.com',
  
  // Backend origins
  'https://michelle-gmail-856401495068.us-central1.run.app',
  'https://appraisers-task-queue-856401495068.us-central1.run.app',
  
  // Development origins
  'http://localhost:3000',
  'http://localhost:8080'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, workers or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ [CORS] Blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
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