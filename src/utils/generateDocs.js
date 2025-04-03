/**
 * Utility to generate documentation files for API routes
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = require('../app');

/**
 * Generate documentation for all registered routes
 * @param {string} outputPath - Path to write the documentation
 */
function generateApiDocumentation(outputPath = './api-docs.md') {
  // Get all routes from Express app
  const routes = extractRoutes(app);
  
  // Generate markdown
  let markdown = '# API Documentation\n\n';
  
  // Group routes by base path
  const groupedRoutes = groupRoutesByBasePath(routes);
  
  // Generate TOC
  markdown += '## Table of Contents\n\n';
  
  Object.keys(groupedRoutes).sort().forEach(basePath => {
    markdown += `- [${basePath}](#${basePath.toLowerCase().replace(/\//g, '').replace(/:/g, '')})\n`;
    
    groupedRoutes[basePath].forEach(route => {
      const anchor = `${route.method.toLowerCase()}-${route.path.toLowerCase().replace(/\//g, '-').replace(/:/g, '')}`;
      markdown += `  - [${route.method.toUpperCase()} ${route.path}](#${anchor})\n`;
    });
    
    markdown += '\n';
  });
  
  // Generate route documentation
  Object.keys(groupedRoutes).sort().forEach(basePath => {
    markdown += `## ${basePath}\n\n`;
    
    groupedRoutes[basePath].forEach(route => {
      const anchor = `${route.method.toLowerCase()}-${route.path.toLowerCase().replace(/\//g, '-').replace(/:/g, '')}`;
      markdown += `### ${route.method.toUpperCase()} ${route.path} {#${anchor}}\n\n`;
      
      if (route.documentation && route.documentation.description) {
        markdown += `${route.documentation.description}\n\n`;
      } else {
        markdown += 'No description available.\n\n';
      }
      
      // Parameters
      if (route.documentation && route.documentation.parameters && Object.keys(route.documentation.parameters).length > 0) {
        markdown += '#### Parameters\n\n';
        
        Object.entries(route.documentation.parameters).forEach(([name, details]) => {
          markdown += `- **${name}**: ${details.description || 'No description'}`;
          if (details.required) markdown += ' (Required)';
          markdown += '\n';
        });
        
        markdown += '\n';
      }
      
      // Request Body
      if (route.documentation && route.documentation.requestBody) {
        markdown += '#### Request Body\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(route.documentation.requestBody, null, 2);
        markdown += '\n```\n\n';
      }
      
      // Response
      if (route.documentation && route.documentation.response) {
        markdown += '#### Response\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(route.documentation.response, null, 2);
        markdown += '\n```\n\n';
      }
      
      markdown += '---\n\n';
    });
  });
  
  // Write to file
  fs.writeFileSync(outputPath, markdown);
  console.log(`Documentation written to ${outputPath}`);
}

/**
 * Extract all routes from Express app
 * @param {express.Application} app - Express application
 * @returns {Array} - Array of route objects
 */
function extractRoutes(app) {
  const routes = [];
  
  function processStack(stack, basePath = '') {
    stack.forEach(middleware => {
      if (middleware.route) {
        // Routes directly on the app
        const path = basePath + (middleware.route.path === '/' ? '' : middleware.route.path);
        
        Object.keys(middleware.route.methods).forEach(method => {
          if (middleware.route.methods[method]) {
            const handler = middleware.route.stack[0].handle;
            
            routes.push({
              method,
              path,
              handler,
              documentation: handler.documentation || {}
            });
          }
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // Nested routers
        const path = getPathFromRegex(middleware.regexp);
        processStack(middleware.handle.stack, basePath + path);
      }
    });
  }
  
  if (app._router && app._router.stack) {
    processStack(app._router.stack);
  }
  
  return routes;
}

/**
 * Extract path from regular expression
 * @param {RegExp} regexp - Regular expression
 * @returns {string} - Extracted path
 */
function getPathFromRegex(regexp) {
  const result = regexp.toString().match(/\/\\\/([^\\]+)/);
  return result ? '/' + result[1] : '/';
}

/**
 * Group routes by base path
 * @param {Array} routes - Array of route objects
 * @returns {Object} - Grouped routes
 */
function groupRoutesByBasePath(routes) {
  const grouped = {};
  
  routes.forEach(route => {
    const parts = route.path.split('/');
    const basePath = parts.length > 1 ? `/${parts[1]}` : '/';
    
    if (!grouped[basePath]) {
      grouped[basePath] = [];
    }
    
    grouped[basePath].push(route);
  });
  
  return grouped;
}

module.exports = {
  generateApiDocumentation
};