const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');

class AuthController {
  static generateToken(email, role = 'user') {
    return jwt.sign(
      { email, role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static setAuthCookie(res, token) {
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.'
        });
      }

      if (!authorizedUsers.includes(email)) {
        console.log('❌ Unauthorized email:', email);
        return res.status(403).json({
          success: false,
          message: 'User not authorized.'
        });
      }

      // In production, use proper password hashing
      const hashedPassword = await bcrypt.hash('appraisily2024', 10);
      const isValidPassword = await bcrypt.compare(password, hashedPassword);

      if (!isValidPassword) {
        console.log('❌ Invalid password attempt for:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const token = AuthController.generateToken(email);

      // Set both cookie and return token for serverless clients
      AuthController.setAuthCookie(res, token);

      console.log('✓ Login successful:', email);
      res.json({
        success: true,
        name: 'Appraisily Admin',
        token: token, // Include token in response for serverless clients
        message: 'Login successful'
      });
    } catch (error) {
      console.error('❌ Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'ID Token is required'
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
        console.log('❌ Unauthorized Google login:', email);
        return res.status(403).json({
          success: false,
          message: 'User not authorized'
        });
      }

      const token = AuthController.generateToken(email);
      AuthController.setAuthCookie(res, token);

      console.log('✓ Google login successful:', email);
      res.json({
        success: true,
        name: payload.name,
        token: token, // Include token in response for serverless clients
        message: 'Login successful'
      });
    } catch (error) {
      console.error('❌ Google authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid Google token'
      });
    }
  }

  static async refresh(req, res) {
    try {
      const token = req.cookies.jwtToken || req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const newToken = AuthController.generateToken(decoded.email, decoded.role);
      
      AuthController.setAuthCookie(res, newToken);

      console.log('✓ Token refreshed for:', decoded.email);
      res.json({
        success: true,
        token: newToken, // Include new token in response for serverless clients
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  }

  static async logout(req, res) {
    res.clearCookie('jwtToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
    console.log('✓ Logout successful');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}

module.exports = {
  login: AuthController.login.bind(AuthController),
  googleLogin: AuthController.googleLogin.bind(AuthController),
  refresh: AuthController.refresh.bind(AuthController),
  logout: AuthController.logout.bind(AuthController)
};