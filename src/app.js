const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const routes = require('./routes');
const { initializeConfig } = require('./config');
const { initializeServices } = require('./services');
const { errorHandler } = require('./middleware/errorHandler');
const { corsOptions } = require('./config/corsConfig');

const app = express();

// Security middleware
app.use(helmet());

// Standard middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

async function startServer() {
  try {
    console.log('Starting server initialization...');

    // Initialize configuration first
    await initializeConfig();
    console.log('✓ Configuration initialized');

    // Initialize all services
    await initializeServices();
    console.log('✓ Services initialized');
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();