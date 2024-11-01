// controllers/authController.js

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
// No acceder a config aquí
const authorizedUsers = require('../shared/authorizedUsers');

exports.authenticateUser = async (req, res) => {
  const { config } = require('../shared/config'); // Importar config dentro de la función
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'idToken es requerido.' });
  }

  try {
    const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    // Verificar si el usuario está autorizado
    if (!authorizedUsers.includes(email)) {
      return res.status(403).json({ success: false, message: 'Usuario no autorizado.' });
    }

    // Generar JWT
    const token = jwt.sign({ email }, config.JWT_SECRET, { expiresIn: '1h' });

    // Establecer el token en una cookie HTTP-only
    res.cookie('jwtToken', token, { httpOnly: true, secure: true });

    res.json({ success: true, name });
  } catch (error) {
    console.error('Error al verificar idToken:', error);
    res.status(401).json({ success: false, message: 'idToken inválido.' });
  }
};

exports.logoutUser = (req, res) => {
  res.clearCookie('jwtToken');
  res.json({ success: true, message: 'Logout exitoso.' });
};
