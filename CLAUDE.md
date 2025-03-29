# APPRAISERS Codebase Guidelines

## Build & Run Commands
- **Main Backend**: `npm run dev` (dev) or `npm start` (prod)
  - **Lint**: `npm run lint` - ESLint for .js files
  - **Tests**: `npm test` - Run all Jest tests
  - **Single test**: `npx jest path/to/test.js -t "test name"` - Run specific test
  - **Debug test**: `NODE_ENV=test node --inspect-brk node_modules/.bin/jest --runInBand`

## Code Style
- **JS**: ES6+, named exports preferred over default exports
- **Naming**: camelCase (variables, functions), PascalCase (components, classes), UPPER_CASE (constants)
- **Formatting**: 2-space indentation, semicolons required
- **Imports**: Group by: 1) framework/core, 2) external libraries, 3) internal modules
- **Error Handling**: Try/catch blocks for async code, context in error messages
- **Documentation**: JSDoc for public APIs and complex functions
- **Testing**: Jest with supertest for API testing
- **API Responses**: Use `{ success: true, data: {...} }` for success, `{ success: false, message: "..." }` for errors

## Architecture
- Express.js backend with RESTful API endpoints
- Follow modular structure with controllers, services, routes, and middleware
- JWT-based authentication with HTTP-only cookies
- WebSocket server for real-time updates with secure connections