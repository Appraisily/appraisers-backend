const jwt = require('jsonwebtoken');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');
const crypto = require('crypto');

// Store for refresh token rotation
const refreshTokens = new Map();

function generateRefreshToken(email) {
  return crypto.randomBytes(40).toString('hex');
}

async function login(req, res) {
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

    if (password !== 'appraisily2024') {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate access token (24h)
    const token = jwt.sign(
      { email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate refresh token (30 days)
    const refreshToken = generateRefreshToken(email);
    refreshTokens.set(refreshToken, {
      email,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Set cookie with appropriate options
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('jwtToken', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Return response in required format
    res.json({
      success: true,
      name: 'Appraisily Admin',
      message: 'Login successful',
      token // Include token for serverless clients
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    // Validate refresh token
    const tokenData = refreshTokens.get(refreshToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token is expired
    if (tokenData.expiresAt < Date.now()) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    // Generate new tokens
    const { email } = tokenData;
    const newToken = jwt.sign(
      { email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken(email);
    refreshTokens.delete(refreshToken);
    refreshTokens.set(newRefreshToken, {
      email,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    };

    res.cookie('jwtToken', newToken, cookieOptions);
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
    path: '/',
    maxAge: 0
  };

  res.clearCookie('jwtToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}

module.exports = {
  login,
  refresh,
  logout
};