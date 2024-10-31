// index.js

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const appraisalRoutes = require('./routes/appraisals');
const { config, initializeConfig } = require('./shared/config'); // Asegúrate de que esta ruta es correcta

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Montar las rutas de apreciaciones
app.use('/api', appraisalRoutes);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Iniciar el Servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
