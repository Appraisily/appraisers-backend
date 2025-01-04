const { config } = require('../config');

class ServiceValidator {
  static validateMethod(service, methodName) {
    if (typeof service[methodName] !== 'function') {
      throw new Error(`Service method ${methodName} is not a function`);
    }
  }

  static validateRequiredMethods(service, requiredMethods) {
    if (!service) {
      throw new Error('Service instance is required');
    }

    const missingMethods = [];
    
    for (const method of requiredMethods) {
      if (typeof service[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    if (missingMethods.length > 0) {
      throw new Error(
        `Service is missing required methods: ${missingMethods.join(', ')}`
      );
    }
  }

  static validateWordPressService(service) {
    const requiredMethods = [
      'initialize',
      'getPost',
      'updatePost'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateSheetsService(service) {
    const requiredMethods = [
      'initialize',
      'getValues',
      'updateValues'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateEmailService(service) {
    const requiredMethods = [
      'initialize',
      'sendAppraisalCompletedEmail',
      'sendAppraisalUpdateEmail'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validatePubSubService(service) {
    const requiredMethods = [
      'initialize',
      'publishMessage'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateAIService(service) {
    const requiredMethods = [
      'initialize',
      'generateDescription',
      'mergeDescriptions'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }
}

module.exports = ServiceValidator;