// 1. First authenticate to get the token
const loginResponse = await fetch('https://appraisers-backend-856401495068.us-central1.run.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'info@appraisily.com',
    password: 'appraisily2024'
  })
});

// 2. The token will be set in cookies automatically
// For serverless clients, you can also get it from Authorization header
const token = loginResponse.headers.get('Authorization');

// 3. Use the token for subsequent requests
const appraisalsResponse = await fetch('https://appraisers-backend-856401495068.us-central1.run.app/api/appraisals', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const appraisals = await appraisalsResponse.json();