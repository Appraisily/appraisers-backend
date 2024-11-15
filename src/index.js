const app = require('./app');
const { initializeConfig } = require('./config');
const { initializeServices } = require('./services');

async function startServer() {
  try {
    console.log('Starting server initialization...');

    // Initialize configuration first
    await initializeConfig();
    console.log('✓ Configuration initialized');

    // Initialize services
    const serviceStatus = await initializeServices();
    console.log('Services initialization status:', serviceStatus);

    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log('Available endpoints:');
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/refresh');
      console.log('  POST /api/auth/logout');
      console.log('  GET  /api/appraisals');
      console.log('  GET  /api/appraisals/completed');
      console.log('  GET  /api/appraisals/:id/list');
      console.log('  GET  /api/appraisals/:id/list-edit');
      console.log('  POST /api/appraisals/:id/set-value');
      console.log('  POST /api/appraisals/:id/complete-process');
      console.log('  POST /api/appraisals/process-worker');
      console.log('  POST /api/update-pending-appraisal');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();