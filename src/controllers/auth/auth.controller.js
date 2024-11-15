const { generateToken, verifyToken } = require('./auth.service');
const { authorizedUsers } = require('../../constants/authorizedUsers');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const token = await generateToken(email, password);
      
      res.cookie('jwtToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async refresh(req, res) {
    try {
      const token = req.cookies.jwtToken;
      const newToken = await verifyToken(token);
      
      res.cookie('jwtToken', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async logout(req, res) {
    res.clearCookie('jwtToken');
    res.json({ success: true });
  }
}

module.exports = new AuthController();