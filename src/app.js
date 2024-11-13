require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeConfig } = require('./config');
const routes = require('./routes');

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// CORS configuration based on environment
const corsOptions = process.env.NODE_ENV === 'development' 
  ? {
      origin: true, // Allow all origins in development
      credentials: true,
      optionsSuccessStatus: 200,
    }
  : {
      origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
      credentials: true,
      optionsSuccessStatus: 200,
    };

// Apply CORS configuration
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint that doesn't require config
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

async function startServer() {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV} mode`);
    
    // Initialize configuration
    await initializeConfig();
    console.log('Configuration initialized successfully');
    
    // Add routes after config is initialized
    app.use('/api', routes);
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;