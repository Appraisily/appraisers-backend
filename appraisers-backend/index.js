// index.js o app.js

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initializeConfig } = require('./shared/config'); // Importar initializeConfig

// Otras importaciones

(async () => {
  try {
    // Inicializar la configuración antes de continuar
    await initializeConfig();
    console.log('Configuración inicializada correctamente.');

    // Importar rutas y controladores después de que config esté inicializado
    const authRoutes = require('./routes/auth');
    const appraisalsRoutes = require('./routes/appraisals');

    // Middlewares
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({
      origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // URL de tu frontend
      credentials: true, // Permitir envío de cookies y cabeceras de autorización
    }));

    // Rutas
    app.use('/api', authRoutes);
    app.use('/api', appraisalsRoutes);

    // Iniciar el servidor
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });

  } catch (error) {
    console.error('Error inicializando la configuración:', error);
    process.exit(1); // Salir del proceso si no se puede inicializar la configuración
  }
})();
