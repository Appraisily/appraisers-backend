const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { corsOptions } = require('./config/corsConfig');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS must be before other middleware
app.use(cors(corsOptions));

// Standard middleware
app.use(express.json());
app.use(cookieParser());

// Health check endpoints
app.get('/_ah/health', (req, res) => res.status(200).send('OK'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// Direct auth route for emergency access
app.post('/api/auth/direct-login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }
  
  if (email !== 'info@appraisily.com') {
    return res.status(403).json({
      success: false,
      message: 'User not authorized.'
    });
  }
  
  if (password !== 'appraisily2024') {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  // Generate a simpler token for emergency access
  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  
  // Set cookie with appropriate options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };
  
  res.cookie('emergency_token', token, cookieOptions);
  
  // Return response in required format
  res.json({
    success: true,
    name: 'Appraisily Admin',
    message: 'Login successful (emergency access)',
    token // Include token for serverless clients
  });
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Mount API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found'
  });
});

module.exports = app;