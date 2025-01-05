const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');

async function googleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user is authorized
    if (!authorizedUsers.includes(email)) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    // Generate session token
    const token = jwt.sign(
      { email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie with appropriate options
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    res.cookie('jwtToken', token, cookieOptions);

    res.json({
      success: true,
      name
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

module.exports = { googleAuth };