// index.js o app.js

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const appraisalsRoutes = require('./routes/appraisals');
const { config } = require('./shared/config');

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Rutas
app.use('/api', authRoutes);
app.use('/api', appraisalsRoutes);

// Iniciar el servidor en el puerto proporcionado por Cloud Run
const PORT = process.env.PORT || 8080; // Usa 8080 como valor predeterminado
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
