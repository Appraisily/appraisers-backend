const allowedOrigins = [
  'https://earnest-choux-a0ec16.netlify.app',
  'https://jazzy-lollipop-0a3217.netlify.app',
  'https://appraisers-frontend-856401495068.us-central1.run.app',
  'https://appraisers.appraisily.com',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ [CORS] Blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'x-shared-secret'],
  exposedHeaders: ['Set-Cookie']
};

module.exports = { corsOptions };