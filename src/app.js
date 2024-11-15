const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { corsOptions } = require('./config/corsConfig');
const routes = require('./routes');
const { initializeConfig } = require('./config');
const { initializeServices } = require('./services');
const { errorHandler } = require('./middleware/errorHandler');

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

    // Initialize services with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await initializeServices();
        console.log('✓ Services initialized');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Failed to initialize services after 3 attempts:', error);
          // Continue starting the server even if some services fail
        } else {
          console.warn(`Service initialization failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    
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