## Security Configuration

This document outlines important security considerations for the Appraisers Backend.

### Development vs Production Settings

The application has different security settings for development and production environments:

#### Development Mode
```javascript
// CORS allows all origins
origin: true
secure: false
sameSite: 'lax'
```

#### Production Mode
```javascript
// CORS restricted to specific origin
origin: 'https://appraisers-frontend-856401495068.us-central1.run.app'
secure: true
sameSite: 'none'
```

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
```

### API Security

1. All endpoints except authentication require valid JWT
2. WordPress integration uses Basic Auth with app passwords
3. Google Sheets integration uses service account credentials
4. SendGrid requires API key for email sending

### CORS Configuration

Development allows all origins for testing, but production strictly limits to the frontend domain. This should be properly configured before deployment.