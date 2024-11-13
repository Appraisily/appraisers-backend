const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

class AuthController {
  static async authenticateUser(req, res) {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required.' });
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

      if (!authorizedUsers.includes(email)) {
        return res.status(403).json({ success: false, message: 'User not authorized.' });
      }

      const token = jwt.sign({ email }, config.JWT_SECRET, { expiresIn: '1h' });

      res.cookie('jwtToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      });

      res.json({ success: true, name });
    } catch (error) {
      console.error('Error verifying idToken:', error);
      res.status(401).json({ success: false, message: 'Invalid idToken.' });
    }
  }

  static logoutUser(req, res) {
    res.clearCookie('jwtToken');
    res.json({ success: true, message: 'Logout successful.' });
  }
}

module.exports = AuthController;