#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Parses the JSON configuration file and generates a server.js file
 * @param {string} configPath - Path to the JSON configuration file
 * @param {string} outputPath - Path where the server.js file will be generated
 */
function generateServer(configPath, outputPath) {
  try {
    // Read and parse the configuration file
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Validate the configuration structure
    validateConfig(config);
    
    // Parse nodes and build a structured representation
    const parsedConfig = parseNodes(config.nodes);
    
    // Generate server code based on the parsed configuration
    const serverCode = generateServerCode(parsedConfig);
    
    // Write the generated code to the output file
    fs.writeFileSync(outputPath, serverCode, 'utf8');
    
    console.log(`Server successfully generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating server:', error.message);
    process.exit(1);
  }
}

/**
 * Validates the configuration structure
 * @param {Object} config - The parsed JSON configuration
 */
function validateConfig(config) {
  if (!config.nodes || !Array.isArray(config.nodes)) {
    throw new Error('Invalid configuration: "nodes" array is required');
  }
  
  // Check if there's at least one entry node
  const entryNode = config.nodes.find(node => 
    node.properties && node.properties.type === 'entry'
  );
  
  if (!entryNode) {
    throw new Error('Invalid configuration: Entry node with type "entry" is required');
  }
}

/**
 * Parse the nodes and build a structured representation
 * @param {Array} nodes - Array of node objects from the configuration
 * @returns {Object} Structured representation of the server components
 */
function parseNodes(nodes) {
  const result = {
    cors: { enabled: false, options: {} },
    auth: { enabled: false, routes: [] },
    adminAuth: { enabled: false, routes: [] },
    logging: { enabled: false },
    routes: []
  };

  // First pass: identify middleware and build basic structure
  nodes.forEach(node => {
    const { id, properties } = node;
    
    if (!properties) return;
    
    if (properties.type === 'middleware') {
      // CORS middleware
      if (properties.allowed_origins) {
        result.cors.enabled = true;
        result.cors.options.origin = properties.allowed_origins;
      }
      
      // Auth middleware
      if (properties.auth_required) {
        result.auth.enabled = true;
      }
      
      // Admin auth middleware
      if (properties.admin_required) {
        result.adminAuth.enabled = true;
      }
      
      // Logging middleware
      if (properties.log_requests) {
        result.logging.enabled = true;
      }
    } 
    // Routes
    else if (properties.endpoint) {
      const route = {
        id,
        endpoint: properties.endpoint,
        method: properties.method || 'GET',
        authRequired: properties.auth_required !== false, // Default to true for security
        adminRequired: !!properties.admin_required
      };
      
      result.routes.push(route);
    }
  });
  
  // Second pass: establish relationships and dependencies
  nodes.forEach(node => {
    if (node.properties && node.properties.type === 'middleware') {
      if (node.properties.admin_required && node.target) {
        // Find all routes that are targeted by this admin middleware
        const targetIds = Array.isArray(node.target) ? node.target : [node.target];
        targetIds.forEach(targetId => {
          const targetNode = nodes.find(n => n.id === targetId);
          if (targetNode && targetNode.properties && targetNode.properties.endpoint) {
            const routeIndex = result.routes.findIndex(r => r.id === targetId);
            if (routeIndex !== -1) {
              result.routes[routeIndex].adminRequired = true;
              result.adminAuth.routes.push(result.routes[routeIndex].endpoint);
            }
          }
        });
      }
    }
  });
  
  return result;
}

/**
 * Generate server code based on the parsed configuration
 * @param {Object} parsedConfig - Structured representation of the server components
 * @returns {string} Generated server code
 */
function generateServerCode(parsedConfig) {
  const { cors, auth, adminAuth, logging, routes } = parsedConfig;
  
  let code = `const express = require("express");\n`;
  
  // Add imports
  if (cors.enabled) {
    code += `const cors = require("cors");\n`;
  }
  code += `const app = express();\n\n`;
  
  // Add middleware
  if (cors.enabled) {
    const origin = Array.isArray(cors.options.origin) && cors.options.origin.includes('*') 
      ? '"*"' 
      : JSON.stringify(cors.options.origin);
    code += `app.use(cors({ origin: ${origin} }));\n`;
  }
  
  code += `app.use(express.json());\n\n`;
  
  // Add authentication middleware
  if (auth.enabled) {
    code += `const authMiddleware = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};\n\n`;
  }
  
  // Add admin authentication middleware
  if (adminAuth.enabled) {
    code += `const adminMiddleware = (req, res, next) => {
  if (req.headers.authorization !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};\n\n`;
  }
  
  // Add logging middleware if enabled
  if (logging.enabled) {
    code += `const loggingMiddleware = (req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
};\n\n`;
  }
  
  // Add routes
  routes.forEach(route => {
    let routeCode = `app.${route.method.toLowerCase()}("${route.endpoint}", `;
    
    const middlewares = [];
    
    if (route.authRequired && auth.enabled) {
      middlewares.push('authMiddleware');
    }
    
    if (route.adminRequired && adminAuth.enabled) {
      middlewares.push('adminMiddleware');
    }
    
    if (logging.enabled) {
      middlewares.push('loggingMiddleware');
    }
    
    // Add middleware to route
    if (middlewares.length > 0) {
      routeCode += middlewares.join(', ') + ', ';
    }
    
    // Add route handler
    routeCode += `(req, res) => res.json({ message: "${generateRouteMessage(route.endpoint)}" }));\n`;
    
    code += routeCode;
  });
  
  // Add server start
  code += `\napp.listen(3000, () => console.log("Server running on port 3000"));\n`;
  
  return code;
}

/**
 * Generate a descriptive message for a route based on its endpoint
 * @param {string} endpoint - The route endpoint
 * @returns {string} - A descriptive message
 */
function generateRouteMessage(endpoint) {
  const routeName = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  switch (routeName) {
    case 'login':
      return 'Login successful';
    case 'signup':
      return 'Signup successful';
    case 'signout':
      return 'Signout successful';
    case 'user':
      return 'User data';
    case 'admin':
      return 'Admin data';
    case 'home':
      return 'Welcome to Home Page';
    case 'about':
      return 'About us';
    case 'news':
      return 'Latest news';
    case 'blogs':
      return 'Blogs list';
    default:
      return `${routeName.charAt(0).toUpperCase() + routeName.slice(1)} resource`;
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node generate_server.js <config.json> [output.js]');
    process.exit(1);
  }
  
  const configPath = args[0];
  const outputPath = args[1] || 'server.js';
  
  generateServer(configPath, outputPath);
}

module.exports = {
  generateServer,
  validateConfig,
  parseNodes,
  generateServerCode
}; 