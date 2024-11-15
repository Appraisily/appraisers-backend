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
        console.log('❌ [authenticateUser] Unauthorized email:', email);
        return res.status(403).json({ 
          success: false, 
          message: 'User not authorized.' 
        });
      }

      // In production, this should use proper password hashing
      if (password !== 'appraisily2024') {
        console.log('❌ [authenticateUser] Invalid password attempt for:', email);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      const token = jwt.sign(
        { email }, 
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      };

      res.cookie('jwtToken', token, cookieOptions);

      console.log('✅ [authenticateUser] Login successful:', email);

      res.json({
        success: true,
        name: 'Appraisily Admin',
        message: 'Login successful'
      });

    } catch (error) {
      console.error('❌ [authenticateUser] Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  static async logoutUser(req, res) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    };

    res.clearCookie('jwtToken', cookieOptions);
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  }
}

module.exports = {
  authenticateUser: AuthController.authenticateUser,
  logoutUser: AuthController.logoutUser
};