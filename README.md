# Server Generator

A Node.js tool that reads a JSON configuration file and generates a fully functional Express server with routes, middleware, and authentication.

## Features

- Parses JSON configuration defining server nodes and links
- Generates a complete Express server implementation
- Supports various middleware types:
  - CORS configuration
  - Authentication
  - Admin authentication
  - Request logging
- Automatically sets up proper route handlers with appropriate middleware
- Validates JSON configuration structure

## Installation

1. Clone this repository:
```bash
git clone https://github.com/veerspeaks/neverAssignment.git
cd neverAssignment
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Basic Usage

1. Create a JSON configuration file (see examples in `config.json` and `config2.json`)
2. Run the generator using npm:
```bash
npm run generate
```

This command will use `config.json` as the default input and generate `server.js` as the output.

3. To use a custom configuration file:
```bash
node generate_server.js <config-file.json> [output-file.js]
```

For example:
```bash
node generate_server.js config2.json custom-server.js
```

4. Run the generated server:
```bash
node server.js
```

### Using as a Package

```javascript
const { generateServer } = require('./generate_server');

// Generate server from configuration file
generateServer('config.json', 'server.js');
```

## JSON Configuration Format

The configuration uses a node-based format where each node represents a component of the server (middleware, route, etc.) and the connections between them define the server's structure.

### Node Types

- **Entry Node**: The starting point of the server configuration
- **Middleware**: CORS, Authentication, Admin Authentication, Logging
- **Routes**: API endpoints with methods and authentication requirements
- **Dispatcher**: Handles responses
- **Exit**: The end point of the server configuration

### Example Configuration

```json
{
  "nodes": [
    {"id": "1", "name": "Start", "source": null, "target": "2", "properties": {"type": "entry"}},
    {"id": "2", "name": "CORS Middleware", "source": "1", "target": "3", "properties": {"type": "middleware", "allowed_origins": ["*"]}},
    {"id": "3", "name": "Auth Middleware", "source": "2", "target": ["4", "5", "6"], "properties": {"type": "middleware", "auth_required": true}},
    {"id": "4", "name": "Login Route", "source": "3", "target": "7", "properties": {"endpoint": "/login", "method": "POST"}},
    {"id": "5", "name": "Signup Route", "source": "3", "target": "7", "properties": {"endpoint": "/signup", "method": "POST"}},
    {"id": "6", "name": "Public Route", "source": "3", "target": "7", "properties": {"endpoint": "/home", "method": "GET", "auth_required": false}},
    {"id": "7", "name": "End", "source": ["4", "5", "6"], "target": null, "properties": {"type": "exit"}}
  ]
}
```

## Project Structure

- `generate_server.js`: The main script that generates the server
- `config.json`: Example server configuration
- `config2.json`: Alternative example configuration
- `server.js`: Generated server (after running the generator)

## License

MIT 