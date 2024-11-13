const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeConfig } = require('./config');
const routes = require('./routes');

const app = express();

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration with specific origin handling
const corsOptions = {
  origin: function(origin, callback) {
    console.log('🌐 [CORS] Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ [CORS] Allowing request with no origin');
      return callback(null, true);
    }

    // Allow all origins in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [CORS] Development mode - allowing all origins');
      return callback(null, true);
    }

    // Create a URL object to parse the origin
    try {
      const originUrl = new URL(origin);
      
      // Allow specific domains and patterns
      const allowedDomains = [
        'localhost',
        'stackblitz.io',
        'webcontainer.io',
        'webcontainer-api.io',
        'appraisers-frontend-856401495068.us-central1.run.app'
      ];

      const isAllowed = allowedDomains.some(domain => 
        originUrl.hostname === domain || 
        originUrl.hostname.endsWith(`.${domain}`)
      );

      if (isAllowed) {
        console.log(`✅ [CORS] Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.log(`❌ [CORS] Blocking origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } catch (error) {
      console.error('❌ [CORS] Error parsing origin:', error);
      callback(new Error('Invalid origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  maxAge: 600 // Cache preflight request results for 10 minutes
};

// Apply CORS middleware before other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Other middleware
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

// Add security headers
app.use((req, res, next) => {
  // Ensure CORS headers are present
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Only set Access-Control-Allow-Origin if origin is allowed
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  next();
});

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