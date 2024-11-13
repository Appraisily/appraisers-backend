const jwt = require('jsonwebtoken');
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

      // Aquí deberías verificar la contraseña contra un hash almacenado
      // Por ahora, usaremos una contraseña hardcodeada para demo
      const validPassword = password === 'appraisily2024';
      
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
        secure: true,
        sameSite: 'None',
        maxAge: 3600000 // 1 hora
      });

      // Devolver respuesta exitosa
      res.json({
        success: true,
        name: 'Appraisily Admin' // Nombre de display para el usuario
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
      secure: true,
      sameSite: 'None'
    });
    
    res.json({ 
      success: true, 
      message: 'Logout successful.' 
    });
  }
}

module.exports = AuthController;