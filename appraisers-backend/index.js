// index.js

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initializeConfig } = require('./shared/config');

(async () => {
  try {
    // Initialize configuration before continuing
    await initializeConfig();
    console.log('Configuración inicializada correctamente.');

    // Import routes after config is initialized
    const authRoutes = require('./routes/auth');
    const appraisalsRoutes = require('./routes/appraisals');
    const updatePendingAppraisalRoute = require('./routes/updatePendingAppraisal');

    // Middlewares
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({
      origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
      credentials: true
    }));

    // Routes
    app.use('/api', authRoutes);
    app.use('/api', appraisalsRoutes);
    app.use('/api', updatePendingAppraisalRoute);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Start the server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });

  } catch (error) {
    console.error('Error inicializando la configuración:', error);
    process.exit(1);
  }
})();