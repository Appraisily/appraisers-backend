const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeConfig } = require('./config');
const routes = require('./routes');

const app = express();

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://appraisers-frontend-856401495068.us-central1.run.app',
      /.*\.webcontainer\.io$/, // Allow all StackBlitz WebContainer domains
      /.*\.stackblitz\.io$/    // Allow all StackBlitz domains
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if the origin matches any of our allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`❌ [CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie']
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Log all requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 [${req.method}] ${req.path}`, {
      origin: req.headers.origin,
      cookies: req.cookies,
      headers: req.headers
    });
    next();
  });
}

// Health check endpoint that doesn't require config
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

async function startServer() {
  try {
    console.log(`🚀 Starting server in ${process.env.NODE_ENV} mode`);
    
    // Initialize configuration
    await initializeConfig();
    console.log('✅ Configuration initialized successfully');
    
    // Add routes after config is initialized
    app.use('/api', routes);
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌍 Backend server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;