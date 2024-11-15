const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

class AuthController {
  static async authenticateUser(req, res) {
    try {
      const { email, password } = req.body;
      console.log('🔑 [authenticateUser] Login attempt:', { email });

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
        config.JWT_SECRET || 'dev-jwt-secret',
        { expiresIn: '24h' }
      );

      // Set cookie with appropriate options
      res.cookie('jwtToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

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

  static async refreshToken(req, res) {
    try {
      const token = req.cookies.jwtToken;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      try {
        const decoded = jwt.verify(token, config.JWT_SECRET || 'dev-jwt-secret');
        
        // Generate new token
        const newToken = jwt.sign(
          { email: decoded.email },
          config.JWT_SECRET || 'dev-jwt-secret',
          { expiresIn: '24h' }
        );

        res.cookie('jwtToken', newToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
          success: true,
          message: 'Token refreshed successfully'
        });
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired'
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  }

  static async logoutUser(req, res) {
    res.cookie('jwtToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      expires: new Date(0)
    });

    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  }
}

module.exports = {
  authenticateUser: AuthController.authenticateUser,
  refreshToken: AuthController.refreshToken,
  logoutUser: AuthController.logoutUser
};