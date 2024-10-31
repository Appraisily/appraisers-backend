// controllers/authController.js

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const authorizedUsers = require('../shared/authorizedUsers');
const { config } = require('../shared/config');

// Configurar cliente OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('TU_CLIENT_ID'); // Reemplaza con tu Client ID real

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: 'TU_CLIENT_ID', // Reemplaza con tu Client ID real
  });
  const payload = ticket.getPayload();
  return payload;
}

exports.authenticate = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token is required.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    console.log('Authenticated user:', payload.email);

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'Access denied: User not authorized.' });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Enviar el JWT como una cookie httpOnly
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 60 * 1000,
    });

    res.json({ success: true, name: payload.name });
  } catch (error) {
    console.error('Error verifying ID Token:', error);
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('jwtToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  });
  res.json({ success: true, message: 'Successfully logged out.' });
};

exports.checkAuth = (req, res) => {
  res.json({ authenticated: true, name: req.user.name });
};
