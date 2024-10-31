// index.js o app.js

const express = require('express');
const app = express();
const cors = require('cors'); // Importar cors
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const appraisalsRoutes = require('./routes/appraisals');

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Configurar CORS
app.use(cors({
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con la URL de tu frontend
  credentials: true, // Permitir el envío de cookies y cabeceras de autorización
}));

// Rutas
app.use('/api', authRoutes);
app.use('/api', appraisalsRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
