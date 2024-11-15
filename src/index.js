const app = require('./app');
const { initializeConfig } = require('./config');
const { initializeServices } = require('./services');

// Graceful shutdown handler
let server;
function handleShutdown() {
  console.log('Received shutdown signal. Starting graceful shutdown...');
  
  if (server) {
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

async function startServer() {
  try {
    console.log('Starting server initialization...');

    // Initialize configuration first
    await initializeConfig();
    console.log('✓ Configuration initialized');

    // Initialize services
    const serviceStatus = await initializeServices();
    console.log('Services initialization status:', serviceStatus);

    // Get port from environment
    const PORT = process.env.PORT || 8080;

    // Create HTTP server
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  handleShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  handleShutdown();
});

// Start the server
startServer();