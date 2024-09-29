// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const authorizedUsers = require('./authorizedUsers'); // Asegúrate de tener este archivo

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con la URL de tu frontend
  credentials: true, // Permitir el envío de cookies
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());

// Configurar el cliente de OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com'); // Tu Client ID

const client = new SecretManagerServiceClient();

// Función para acceder al secreto en Secret Manager
async function getJwtSecret() {
  const secretName = `projects/civil-forge-403609/secrets/jwt-secret/versions/latest`;

  const [version] = await client.accessSecretVersion({
    name: secretName,
  });

  const payload = version.payload.data.toString('utf8');
  return payload;
}

// Configurar la clave secreta para JWT desde Secret Manager
let JWT_SECRET;

(async () => {
  try {
    JWT_SECRET = await getJwtSecret();
    console.log('JWT_SECRET obtenido correctamente.');
  } catch (error) {
    console.error('Error al obtener JWT_SECRET:', error);
    process.exit(1); // Salir si no se puede obtener el secreto
  }
})();

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Tu Client ID
  });

  const payload = ticket.getPayload();
  return payload;
}

// Middleware de Autenticación y Autorización usando JWT desde Authorization header
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Almacenar información del usuario en req.user

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Acceso prohibido. No tienes permisos para acceder a este recurso.' });
    }

    next();
  } catch (error) {
    console.error('Error al verificar el JWT:', error);
    res.status(401).json({ success: false, message: 'Token inválido.' });
  }
}

// Ruta de autenticación
app.post('/api/authenticate', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token es requerido.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    console.log('Usuario autenticado:', payload.email);

    // Generar un JWT propio
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Token válido por 1 hora
    );

    // Enviar el JWT en la respuesta
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error al verificar el ID Token:', error);
    res.status(401).json({ success: false, message: 'Autenticación fallida.' });
  }
});

// Ruta para cerrar sesión
app.post('/api/logout', (req, res) => {
  // Como estamos usando Authorization header, no hay cookies que limpiar
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// ... (Resto de tus rutas y configuración de Google Sheets API)

// Iniciar el Servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend está corriendo en el puerto ${PORT}`);
});
