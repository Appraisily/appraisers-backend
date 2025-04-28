const jwt = require('jsonwebtoken');
const { config } = require('../../config');
const { authorizedUsers } = require('../../constants/authorizedUsers');

class AuthService {
  async generateToken(email, password) {
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    if (!authorizedUsers.includes(email)) {
      throw new Error('User not authorized');
    }

    if (password !== 'appraisily2024') {
      throw new Error('Invalid credentials');
    }

    return jwt.sign(
      { email },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  async verifyToken(token) {
    if (!token) {
      throw new Error('Token required');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    return jwt.sign(
      { email: decoded.email },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  generateWorkerToken() {
    return jwt.sign(
      { role: 'worker' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
}

module.exports = new AuthService();