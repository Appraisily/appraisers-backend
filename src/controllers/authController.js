const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

class AuthController {
  static async authenticateUser(req, res) {
    try {
      const { email, password } = req.body;

      console.log('🔑 [authenticateUser] Login attempt:', { 
        email, 
        timestamp: new Date().toISOString() 
      });

      if (!email || !password) {
        console.log('❌ [authenticateUser] Missing email or password');
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

      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');

      const expectedHash = crypto
        .createHash('sha256')
        .update('appraisily2024')
        .digest('hex');

      if (hashedPassword !== expectedHash) {
        console.log('❌ [authenticateUser] Invalid password attempt for:', email);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      // Generate access token and refresh token
      const accessToken = this.generateAccessToken(email);
      const refreshToken = this.generateRefreshToken(email);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      };

      // Set both tokens as cookies
      console.log('🍪 [authenticateUser] Setting cookies with options:', cookieOptions);
      res.cookie('jwtToken', accessToken, { 
        ...cookieOptions, 
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.cookie('refreshToken', refreshToken, { 
        ...cookieOptions, 
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      console.log('✅ [authenticateUser] Login successful:', { 
        email, 
        timestamp: new Date().toISOString() 
      });

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
      console.log('🔄 [refreshToken] Attempting to refresh token');
      
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        console.log('❌ [refreshToken] No refresh token found in cookies');
        return res.status(401).json({ 
          success: false, 
          message: 'No refresh token provided' 
        });
      }

      // Verify the refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, config.JWT_SECRET);
      } catch (error) {
        console.error('❌ [refreshToken] Invalid refresh token:', error);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid refresh token' 
        });
      }

      // Check if user is still authorized
      if (!authorizedUsers.includes(decoded.email)) {
        console.log('❌ [refreshToken] User no longer authorized:', decoded.email);
        return res.status(403).json({ 
          success: false, 
          message: 'User not authorized' 
        });
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(decoded.email);

      // Set the new access token as a cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      };

      console.log('🍪 [refreshToken] Setting new access token cookie');
      res.cookie('jwtToken', newAccessToken, cookieOptions);

      console.log('✅ [refreshToken] Token refresh successful for:', decoded.email);
      res.json({ 
        success: true, 
        message: 'Token refreshed successfully' 
      });

    } catch (error) {
      console.error('❌ [refreshToken] Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error refreshing token' 
      });
    }
  }

  static logoutUser(req, res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    console.log('🍪 [logoutUser] Clearing cookies');
    res.clearCookie('jwtToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  }

  static generateAccessToken(email) {
    return jwt.sign(
      { email }, 
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static generateRefreshToken(email) {
    return jwt.sign(
      { email }, 
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

module.exports = AuthController;