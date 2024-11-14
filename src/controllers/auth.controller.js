const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

class AuthController {
  static async authenticateUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required.' 
        });
      }

      if (!authorizedUsers.includes(email)) {
        return res.status(403).json({ 
          success: false, 
          message: 'User not authorized.' 
        });
      }

      // In a real application, you would validate the password against a hashed version
      // For now, we're using a simple check
      if (password !== 'appraisily2024') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials.' 
        });
      }

      const token = jwt.sign(
        { email }, 
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('jwtToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        success: true,
        name: 'Appraisily Admin',
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  static logoutUser(req, res) {
    res.clearCookie('jwtToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  }
}

module.exports = AuthController;