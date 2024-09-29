// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const authorizedUsers = require('./authorizedUsers'); // Import authorized users

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const client = new SecretManagerServiceClient();

let JWT_SECRET;

// Function to get secrets from Secret Manager
async function getSecret(secretName) {
  const projectId = 'civil-forge-403609'; // Correct project ID
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');
  return payload;
}

// Middleware to authenticate and authorize users
async function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Store user info in req.user

    // Authorization: Check if the user is authorized
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this resource.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

// Route for authentication
app.post('/api/authenticate', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token is required.' });
  }

  try {
    // Verify ID Token with Google
    const oauth2Client = new google.auth.OAuth2();
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Your OAuth 2.0 Client ID
    });
    const payload = ticket.getPayload();

    // Generate a JWT for your application
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send the JWT as an httpOnly cookie
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true, // Ensure your app uses HTTPS
      sameSite: 'Strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying ID Token:', error);
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
});

// Route to logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Route to get all appraisals
app.get('/api/appraisals', authenticate, async (req, res) => {
  try {
    // TODO: Fetch appraisals from Google Sheets or your data source
    // For demonstration, returning mock data
    const mockAppraisals = [
      {
        id: '1',
        date: '2024-09-28',
        appraisalType: 'Art',
        identifier: 'A123',
        status: 'Pending',
        iaDescription: 'A beautiful landscape painting.',
        wordpressUrl: 'https://www.appraisily.com/wp-admin/post.php?post=137077&action=edit'
      },
      // Add more appraisals as needed
    ];
    res.json(mockAppraisals);
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    res.status(500).send('Error fetching appraisals.');
  }
});

// Route to get a specific appraisal
app.get('/api/appraisals/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // TODO: Fetch the specific appraisal from Google Sheets or your data source
    // For demonstration, returning mock data based on id
    const mockAppraisal = {
      id: '1',
      date: '2024-09-28',
      appraisalType: 'Art',
      identifier: 'A123',
      status: 'Pending',
      iaDescription: 'A beautiful landscape painting.',
      wordpressUrl: 'https://www.appraisily.com/wp-admin/post.php?post=137077&action=edit'
    };

    if (id !== mockAppraisal.id) {
      return res.status(404).json({ success: false, message: 'Appraisal not found.' });
    }

    res.json(mockAppraisal);
  } catch (error) {
    console.error('Error fetching appraisal:', error);
    res.status(500).send('Error fetching appraisal.');
  }
});

// Route to complete an appraisal
app.post('/api/appraisals/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal value and description are required.' });
  }

  try {
    // TODO: Fetch the specific appraisal to get the WordPress URL
    // For demonstration, using mock data
    const mockAppraisal = {
      id: '1',
      wordpressUrl: 'https://www.appraisily.com/wp-admin/post.php?post=137077&action=edit'
    };

    if (id !== mockAppraisal.id) {
      return res.status(404).json({ success: false, message: 'Appraisal not found.' });
    }

    const wordpressPostId = getPostIdFromUrl(mockAppraisal.wordpressUrl);

    // Get WordPress credentials from Secret Manager
    const wpUsername = await getSecret('wp_username');
    const wpAppPassword = await getSecret('wp_app_password');

    // Update the ACF field via WordPress REST API
    const response = await updateWordPressACFField(wordpressPostId, 'value', appraisalValue, wpUsername, wpAppPassword);

    if (response.success) {
      res.json({ success: true, message: 'Appraisal completed successfully.' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update WordPress ACF field.' });
    }
  } catch (error) {
    console.error('Error completing appraisal:', error);
    res.status(500).json({ success: false, message: 'Error completing appraisal.' });
  }
});

// Function to extract WordPress Post ID from URL
function getPostIdFromUrl(url) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  return params.get('post');
}

// Function to update WordPress ACF field using REST API
async function updateWordPressACFField(postId, fieldName, value, username, appPassword) {
  const fetch = require('node-fetch'); // Ensure node-fetch is installed

  const url = `https://www.appraisily.com/wp-json/wp/v2/posts/${postId}`;

  const data = {
    meta: {
      [fieldName]: value
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64')
    },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    return { success: true };
  } else {
    const errorData = await response.json();
    console.error('WordPress REST API Error:', errorData);
    return { success: false };
  }
}

// Start the server after fetching secrets
async function startServer() {
  try {
    // Fetch JWT_SECRET from Secret Manager
    JWT_SECRET = await getSecret('jwt-secret');

    // Start Express server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
