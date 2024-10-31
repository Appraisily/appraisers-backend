// app.js

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeConfig } = require('./shared/config');
const authenticate = require('./middleware/authenticate');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con tu dominio frontend
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Inicializar configuración
initializeConfig().then(() => {
  // Importar y usar rutas
  const authRoutes = require('./routes/auth');
  const appraisalRoutes = require('./routes/appraisals');
  const updatePendingAppraisalRoute = require('./routes/updatePendingAppraisal');

  app.use('/api', authRoutes);
  app.use('/api', appraisalRoutes);
  app.use('/api', updatePendingAppraisalRoute);

  // Iniciar el Servidor
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
  });
}).catch((error) => {
  console.error('Error inicializando la configuración:', error);
  process.exit(1);
});
