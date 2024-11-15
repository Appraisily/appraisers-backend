const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

  static async authenticateGoogle(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'ID token is required'
        });
      }

      const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const email = payload.email;

      if (!authorizedUsers.includes(email)) {
        return res.status(403).json({
          success: false,
          message: 'User not authorized'
        });
      }

      const token = jwt.sign(
        { email },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
      };

      res.cookie('jwtToken', token, cookieOptions);

      res.json({
        success: true,
        name: payload.name,
        message: 'Google authentication successful'
      });
    } catch (error) {
      console.error('Error in Google authentication:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid Google token'
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
        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Generate new token
        const newToken = jwt.sign(
          { email: decoded.email },
          config.JWT_SECRET,
          { expiresIn: '24h' }
        );

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000
        };

        res.cookie('jwtToken', newToken, cookieOptions);

        res.json({
          success: true,
          message: 'Token refreshed successfully'
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async logoutUser(req, res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
  authenticateGoogle: AuthController.authenticateGoogle,
  refreshToken: AuthController.refreshToken,
  logoutUser: AuthController.logoutUser
};