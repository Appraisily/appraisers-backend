const http = require('http');
const https = require('https');
const fs = require('fs');
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

    if (serviceStatus.failed.includes('pubsub')) {
      console.warn('⚠️ PubSub service failed to initialize. Some features may be limited.');
    }

    // Get port from environment
    const PORT = process.env.PORT || 8080;

    // Determine if we're running in a secure environment (like Cloud Run)
    // Cloud Run provides HTTPS automatically, we just need to listen on the port
    const isSecureEnvironment = process.env.NODE_ENV === 'production' || process.env.SECURE === 'true';
    
    // Create appropriate server
    let appServer;
    
    if (isSecureEnvironment) {
      console.log('Running in secure environment, using HTTPS configuration');
      // In Cloud Run, we don't need to provide certificates, just use HTTP
      // The service will still be accessible via HTTPS because Cloud Run handles it
      appServer = http.createServer(app);
      console.log('Server will support HTTPS through Cloud Run HTTPS termination');
    } else if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
      // For local development with SSL certs
      console.log('Using local SSL certificates');
      const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH)
      };
      appServer = https.createServer(httpsOptions, app);
    } else {
      // Regular HTTP for local development
      console.log('Using HTTP for local development');
      appServer = http.createServer(app);
    }
    
    server = appServer;
    
    // Start listening
    appServer.listen(PORT, '0.0.0.0', () => {
      const protocol = isSecureEnvironment || (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) 
        ? 'HTTPS' : 'HTTP';
      console.log(`✓ Server (${protocol}) running on port ${PORT}`);
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