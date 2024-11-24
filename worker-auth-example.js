// Example of using worker authentication

// 1. Using shared secret (recommended for backend-to-backend)
const SHARED_SECRET = process.env.SHARED_SECRET;

const response = await fetch('https://appraisers-backend-856401495068.us-central1.run.app/api/appraisals', {
  headers: {
    'Content-Type': 'application/json',
    'x-shared-secret': SHARED_SECRET
  }
});

// 2. Using worker JWT token (alternative)
const workerToken = req.user.token; // Token received after shared secret auth

const response2 = await fetch('https://appraisers-backend-856401495068.us-central1.run.app/api/appraisals', {
  headers: {
    'Authorization': `Bearer ${workerToken}`,
    'Content-Type': 'application/json'
  }
});