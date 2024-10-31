
// middleware/authenticate.js

const jwt = require('jsonwebtoken');
const authorizedUsers = require('../shared/authorizedUsers');
const { config } = require('../shared/config');

module.exports = function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this resource.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};
