const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // Add dotenv configuration
const { initializeConfig } = require('./config');
const routes = require('./routes');

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

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

async function startServer() {
  try {
    // Set default NODE_ENV if not set
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    
    await initializeConfig();
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Error initializing configuration:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;