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
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

async function startServer() {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV} mode`);
    
    await initializeConfig();
    console.log('Configuration initialized successfully');
    
    app.use('/api', routes);
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;