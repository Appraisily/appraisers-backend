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

      // Verify if user is authorized
      if (!authorizedUsers.includes(email)) {
        console.log('❌ [authenticateUser] Unauthorized email:', email);
        return res.status(403).json({ 
          success: false, 
          message: 'User not authorized.' 
        });
      }

      // Hash the password with SHA-256
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');

      // Hardcoded hash of 'appraisily2024'
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

      // Generate JWT token
      const token = jwt.sign(
        { email }, 
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Set secure cookie with proper options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3600000, // 1 hour
        path: '/'
      };

      console.log('🍪 [authenticateUser] Setting cookie with options:', cookieOptions);
      res.cookie('jwtToken', token, cookieOptions);

      // Return successful response
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

  static logoutUser(req, res) {
    // Clear the cookie with the same options used to set it
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    console.log('🍪 [logoutUser] Clearing cookie with options:', cookieOptions);
    res.clearCookie('jwtToken', cookieOptions);
    
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  }
}

module.exports = AuthController;