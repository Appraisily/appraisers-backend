# Security Configuration

This document outlines important security considerations for the Appraisers Backend.

## Environment Settings

The application has different security settings for development and production environments:

### Development Mode
```javascript
// CORS allows all origins
origin: true
secure: false
sameSite: 'lax'
```

### Production Mode
```javascript
// CORS restricted to specific origin
origin: 'https://appraisers-frontend-856401495068.us-central1.run.app'
secure: true
sameSite: 'none'
```

## WebSocket Secure Connections (WSS)

The backend now supports secure WebSocket connections (WSS), which are required when the frontend is served over HTTPS.

### Production Environment

In the production environment (Cloud Run), the service automatically supports WSS connections by:

1. Using the `SECURE=true` environment variable to indicate a secure environment
2. Relying on Cloud Run's automatic HTTPS termination
3. Configuring the WebSocket server to work with the HTTPS-terminated connection

No additional configuration is required for production deployments.

### Local Development with SSL

For local development with SSL, you can use self-signed certificates:

1. Generate SSL certificates for local development:

```bash
# Create a directory for certificates
mkdir -p ssl

# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem
```

2. Set the environment variables:

```bash
export SSL_CERT_PATH=./ssl/cert.pem
export SSL_KEY_PATH=./ssl/key.pem
export SECURE=true
```

3. Start the server:

```bash
npm run dev
```

The server will start with HTTPS enabled, and WebSocket connections will use WSS protocol.

### Frontend Connection

The frontend automatically detects the protocol (HTTP/HTTPS) and uses the appropriate WebSocket protocol (WS/WSS):

```javascript
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
```

This ensures that:
- On HTTP pages, WS protocol is used
- On HTTPS pages, WSS protocol is used

### WebSocket Security Considerations

1. **Mixed Content Blocking**: Browsers block insecure WebSocket connections (WS) from secure pages (HTTPS). Always ensure WSS is used with HTTPS.

2. **Cross-Origin Connections**: WebSocket connections are subject to the same-origin policy. The server implements CORS protections for WebSocket connections.

3. **Connection Validation**: Consider implementing token-based validation for WebSocket connections to prevent unauthorized access.

4. **Message Sanitization**: Always validate and sanitize incoming WebSocket messages to prevent injection attacks.

5. **Rate Limiting**: Consider implementing rate limiting to prevent abuse.

### Authentication

1. **JWT Secret**
   - In production: Stored in Google Secret Manager as 'jwt-secret'
   - In development: Stored in .env as JWT_SECRET
   - IMPORTANT: The secret name in Google Secret Manager must remain as 'jwt-secret'

2. **Password Storage**
   - Passwords are hashed using SHA-256
   - In production, passwords should be stored in a secure database with proper salt
   - Current development password: 'appraisily2024'
   - Hashed value: '7c4a8d09ca3762af61e59520943dc26494f8941b'

3. **JWT Tokens**
   - Tokens are stored in httpOnly cookies
   - 1-hour expiration time
   - Secure flag enabled in production

4. **Authorized Users**
   - Whitelist of authorized email addresses in `src/constants/authorizedUsers.js`
   - Currently only allows: 'info@appraisily.com'

### Security TODOs for Production

1. Implement proper password hashing with salt
2. Store user credentials in a secure database
3. Add rate limiting for authentication endpoints
4. Implement MFA (Multi-Factor Authentication)
5. Add security headers (helmet.js)
6. Regular security audits of dependencies
7. Implement proper session management
8. Add request validation middleware

### Environment Variables

Required secure configuration in `.env`:
```
JWT_SECRET=<strong-random-secret>
WORDPRESS_APP_PASSWORD=<secure-password>
SENDGRID_API_KEY=<api-key>
SHARED_SECRET=<strong-random-secret>

# WebSocket SSL Configuration (for local development)
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
SECURE=true
```

In production environments:
- `SECURE=true` is set in the Dockerfile
- SSL certificates are handled by Cloud Run

### API Security

1. All endpoints except authentication require valid JWT
2. WordPress integration uses Basic Auth with app passwords
3. Google Sheets integration uses service account credentials
4. SendGrid requires API key for email sending

### CORS Configuration

Development allows all origins for testing, but production strictly limits to the frontend domain. This should be properly configured before deployment.