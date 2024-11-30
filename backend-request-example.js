// Example of how to make backend-to-backend requests
const fetch = require('node-fetch');

async function makeBackendRequest(endpoint) {
  const SHARED_SECRET = process.env.SHARED_SECRET; // Get from environment variables
  
  try {
    const response = await fetch(`https://appraisers-backend-856401495068.us-central1.run.app/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': SHARED_SECRET
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
}

// Example usage:
async function getAppraisals() {
  try {
    const appraisals = await makeBackendRequest('/appraisals');
    return appraisals;
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    throw error;
  }
}

async function getCompletedAppraisals() {
  try {
    const completed = await makeBackendRequest('/appraisals/completed');
    return completed;
  } catch (error) {
    console.error('Error fetching completed appraisals:', error);
    throw error;
  }
}

module.exports = {
  makeBackendRequest,
  getAppraisals,
  getCompletedAppraisals
};