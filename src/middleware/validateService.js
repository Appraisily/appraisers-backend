const { config } = require('../config');

class ServiceValidator {
  static validateMethod(service, methodName) {
    if (typeof service[methodName] !== 'function') {
      throw new Error(`Service method ${methodName} is not a function`);
    }
  }

  static validateRequiredMethods(service, requiredMethods) {
    const missingMethods = [];
    
    for (const method of requiredMethods) {
      try {
        this.validateMethod(service, method);
      } catch (error) {
        missingMethods.push(method);
      }
    }

    if (missingMethods.length > 0) {
      throw new Error(
        `Service is missing required methods: ${missingMethods.join(', ')}`
      );
    }
  }

  static validateAppraisalService(service) {
    const requiredMethods = [
      'getAppraisals',
      'getCompletedAppraisals',
      'getDetails',
      'getDetailsForEdit',
      'setValue',
      'buildPdf',
      'processWorker',
      'completeProcess'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateWordPressService(service) {
    const requiredMethods = [
      'getPost',
      'updatePost'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateSheetsService(service) {
    const requiredMethods = [
      'getValues',
      'updateValues'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateEmailService(service) {
    const requiredMethods = [
      'sendAppraisalCompletedEmail',
      'sendAppraisalUpdateEmail'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validatePubSubService(service) {
    const requiredMethods = [
      'publishMessage'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }

  static validateAIService(service) {
    const requiredMethods = [
      'generateDescription',
      'mergeDescriptions'
    ];

    this.validateRequiredMethods(service, requiredMethods);
  }
}

module.exports = ServiceValidator;