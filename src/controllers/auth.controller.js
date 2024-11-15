const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

class AuthController {
  // ... all the existing methods ...
}

// Export the class methods individually
module.exports = {
  authenticateUser: AuthController.authenticateUser,
  logoutUser: AuthController.logoutUser
};