/**
 * Script to generate API documentation
 */
const path = require('path');
const { generateApiDocumentation } = require('../services/generateDocs');

// Define the output path relative to the project root
const outputPath = path.join(__dirname, '../../api-docs.md');

// Generate the documentation
generateApiDocumentation(outputPath);