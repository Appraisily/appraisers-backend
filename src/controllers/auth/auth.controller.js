const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');

class AuthController {
  // Regular email/password login
  async login(req, res) {
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

      // In production, this should use proper password hashing
      if (password !== 'appraisily2024') {
        console.log('❌ Invalid password attempt for:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const token = this.generateToken(email);
      this.setAuthCookie(res, token);

      console.log('✓ Login successful:', email);
      res.json({
        success: true,
        name: 'Appraisily Admin',
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

  // Google OAuth login
  async googleLogin(req, res) {
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

      const token = this.generateToken(email);
      this.setAuthCookie(res, token);

      console.log('✓ Google login successful:', email);
      res.json({
        success: true,
        name: payload.name,
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

  // Token refresh
  async refresh(req, res) {
    try {
      const token = req.cookies.jwtToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const newToken = this.generateToken(decoded.email);
      this.setAuthCookie(res, newToken);

      console.log('✓ Token refreshed for:', decoded.email);
      res.json({
        success: true,
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

  // Logout
  async logout(req, res) {
    this.clearAuthCookie(res);
    console.log('✓ Logout successful');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Helper methods
  generateToken(email) {
    return jwt.sign(
      { email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  setAuthCookie(res, token) {
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  clearAuthCookie(res) {
    res.clearCookie('jwtToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
  }
}

module.exports = new AuthController();