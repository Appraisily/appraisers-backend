const jwt = require('jsonwebtoken');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');

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
    const token = req.cookies.jwtToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const newToken = jwt.sign(
      { email: decoded.email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie('jwtToken', newToken, cookieOptions);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken // Include new token for serverless clients
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

async function logout(req, res) {
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

module.exports = {
  login,
  refresh,
  logout
};