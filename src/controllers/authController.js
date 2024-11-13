const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

class AuthController {
  static async authenticateUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    try {
      // Verificar si el usuario está autorizado
      if (!authorizedUsers.includes(email)) {
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

      // En producción, esto debería compararse con un hash almacenado seguramente
      // Por ahora, comparamos con el hash de 'appraisily2024'
      const validPassword = hashedPassword === '7c4a8d09ca3762af61e59520943dc26494f8941b'; // Hash of 'appraisily2024'
      
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      // Generar JWT
      const token = jwt.sign({ email }, config.JWT_SECRET, { expiresIn: '1h' });

      // Establecer cookie segura
      res.cookie('jwtToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Only secure in production
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        maxAge: 3600000 // 1 hora
      });

      // Devolver respuesta exitosa
      res.json({
        success: true,
        name: 'Appraisily Admin'
      });

    } catch (error) {
      console.error('Error in authentication:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error.' 
      });
    }
  }

  static logoutUser(req, res) {
    res.clearCookie('jwtToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none'
    });
    
    res.json({ 
      success: true, 
      message: 'Logout successful.' 
    });
  }
}

module.exports = AuthController;