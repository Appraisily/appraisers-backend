const SHARED_SECRET = 'your-shared-secret'; // Get this from your environment variables

// Make requests using the shared secret
const appraisalsResponse = await fetch('https://appraisers-backend-856401495068.us-central1.run.app/api/appraisals', {
  headers: {
    'Content-Type': 'application/json',
    'x-shared-secret': SHARED_SECRET
  }
});

const appraisals = await appraisalsResponse.json();