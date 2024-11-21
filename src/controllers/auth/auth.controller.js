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

    const token = jwt.sign(
      { email, role: 'user' },
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

async function refresh(req, res) {
  try {
    const token = req.cookies.jwtToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const newToken = jwt.sign(
      { email: decoded.email, role: decoded.role || 'user' },
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

async function logout(req, res) {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  };

  res.clearCookie('jwtToken', cookieOptions);
  console.log('✓ Logout successful');
  
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