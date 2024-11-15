const app = require('./app');
const { initializeConfig } = require('./config');
const { initializeServices } = require('./services');

// Set development environment if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

async function startServer() {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV} mode...`);

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
        if (retries === 0 && process.env.NODE_ENV === 'production') {
          throw error;
        }
        console.warn(`Service initialization failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Continuing in development mode with limited functionality');
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
startServer();