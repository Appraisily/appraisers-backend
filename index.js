// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authorizedUsers = require('./authorizedUsers'); // List of authorized users

const url = require('url');
const fetch = require('node-fetch');
const app = express();

// CORS Configuration
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Your frontend URL
  credentials: true, // Allow credentials (cookies)
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Configure OAuth2 client with your Client ID
const oauthClient = new OAuth2Client('856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com'); // Your Client ID

const client = new SecretManagerServiceClient();

// Generic function to get a secret
async function getSecret(secretName) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT is not defined.');
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({
    name: name,
  });

  const payload = version.payload.data.toString('utf8');
  return payload;
}

// Configure variables for secrets
let JWT_SECRET;

// Function to verify the ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Your Client ID
  });

  const payload = ticket.getPayload();
  return payload;
}

// Authentication and Authorization Middleware using JWT from the cookie
function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Store user information in req.user

    // Check if the user is in the authorized users list
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this resource.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

// Authentication Route
app.post('/api/authenticate', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token is required.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    console.log('Authenticated user:', payload.email);

    // Check if the user is in the authorized users list
    if (!authorizedUsers.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'Access denied: User not authorized.' });
    }

    // Generate your own JWT
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Token valid for 1 hour
    );

    // Send the JWT as an httpOnly cookie
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true, // Ensure your app uses HTTPS
      sameSite: 'None', // 'None' to allow cross-site cookies
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Send the user's name in the response
    res.json({ success: true, name: payload.name });
  } catch (error) {
    console.error('Error verifying ID Token:', error);
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
});

// Logout Route
app.post('/api/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
  });
  res.json({ success: true, message: 'Successfully logged out.' });
});

// Function to initialize the Google Sheets API
async function initializeSheets() {
  try {
    console.log('Accessing service account secret...');
    const serviceAccount = await getSecret('service-account-json');
    console.log('Service account secret accessed successfully.');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Authenticated with Google Sheets API');
    return sheets;
  } catch (error) {
    console.error('Error authenticating with Google Sheets API:', error);
    throw error; // Propagate the error to prevent server start
  }
}

// Function to start the server
async function startServer() {
  try {
    // Get secrets before starting the server
    JWT_SECRET = await getSecret('jwt-secret');
    console.log('JWT_SECRET obtained successfully.');

    const sheets = await initializeSheets();

    // Your Google Sheet ID
    const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    const SHEET_NAME = 'Pending Appraisals';

    // **Endpoint: Get Pending Appraisals**
    app.get('/api/appraisals', authenticate, async (req, res) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A2:H`, // Adjust the range to include column H
        });

        const rows = response.data.values || [];
        console.log(`Total rows obtained: ${rows.length}`);

        const appraisals = rows.map((row, index) => ({
          id: index + 2, // Row number in the sheet (A2 corresponds to id=2)
          date: row[0] || '', // Column A: Date
          appraisalType: row[1] || '', // Column B: Appraisal Type
          identifier: row[2] || '', // Column C: Appraisal Number
          status: row[5] || '', // Column F: Status
          wordpressUrl: row[6] || '', // Column G: WordPress URL
          iaDescription: row[7] || '' // Column H: AI Description
        }));

        console.log(`Total appraisals mapped: ${appraisals.length}`);
        res.json(appraisals);
      } catch (error) {
        console.error('Error fetching appraisals:', error);
        res.status(500).json({ success: false, message: 'Error fetching appraisals.' });
      }
    });

    // **Endpoint: Get Details of a Specific Appraisal**
    app.get('/api/appraisals/:id', authenticate, async (req, res) => {
      const { id } = req.params; // Row number

      try {
        // Update the range to include column I
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${id}:I${id}`, // Now includes up to column I
        });

        const row = response.data.values ? response.data.values[0] : null;

        if (!row) {
          return res.status(404).json({ success: false, message: 'Appraisal not found.' });
        }

        // Include customer description (column I)
        const appraisal = {
          id: id,
          date: row[0] || '',
          appraisalType: row[1] || '',
          identifier: row[2] || '',
          status: row[5] || '',
          wordpressUrl: row[6] || '',
          iaDescription: row[7] || '',
          customerDescription: row[8] || '' // New property
        };

        // Extract the post ID from the WordPress URL
        const wordpressUrl = appraisal.wordpressUrl;
        const parsedUrl = new URL(wordpressUrl);
        const postId = parsedUrl.searchParams.get('post');

        if (!postId) {
          return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
        }

        // Build the endpoint to fetch the post
        const wpEndpoint = `https://www.appraisily.com/wp-json/wp/v2/appraisals/${postId}`;

        // Make the request to the WordPress REST API
        const wpResponse = await fetch(wpEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          console.error('Error fetching WordPress post:', errorText);
          return res.status(500).json({ success: false, message: 'Error fetching data from WordPress.' });
        }

        const wpData = await wpResponse.json();

        // Get ACF fields
        const acfFields = wpData.acf || {};

        // Get image URLs
        const images = {
          main: await getImageUrl(acfFields.main),
          age: await getImageUrl(acfFields.age),
          signature: await getImageUrl(acfFields.signature)
        };

        // Add images to the response
        appraisal.images = images;

        // Send the response with customer description included
        res.json(appraisal);
      } catch (error) {
        console.error('Error fetching appraisal details:', error);
        res.status(500).json({ success: false, message: 'Error fetching appraisal details.' });
      }
    });

    // Asynchronous function to get the image URL
    const getImageUrl = async (imageField) => {
      if (!imageField) return null;

      // If it's a number or a string representing a number (image ID)
      if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
        const mediaId = imageField;
        try {
          const mediaResponse = await fetch(`https://www.appraisily.com/wp-json/wp/v2/media/${mediaId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          if (!mediaResponse.ok) {
            console.error(`Error fetching image with ID ${mediaId}:`, await mediaResponse.text());
            return null;
          }
          const mediaData = await mediaResponse.json();
          return mediaData.source_url || null;
        } catch (error) {
          console.error(`Error fetching image with ID ${mediaId}:`, error);
          return null;
        }
      }

      // If it's a direct URL
      if (typeof imageField === 'string' && imageField.startsWith('http')) {
        return imageField;
      }

      // If it's an object with a 'url' property
      if (typeof imageField === 'object' && imageField.url) {
        return imageField.url;
      }

      return null;
    };

    // **Endpoint: Complete Appraisal**
    app.post('/api/appraisals/:id/complete', authenticate, async (req, res) => {
      const { id } = req.params; // Row number
      const { appraisalValue, description } = req.body;

      if (appraisalValue === undefined || description === undefined) {
        return res.status(400).json({ success: false, message: 'Appraisal value and description are required.' });
      }

      try {
        // Update columns J and K with the provided data
        const updateRange = `${SHEET_NAME}!J${id}:K${id}`;
        const values = [[appraisalValue, description]];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: updateRange,
          valueInputOption: 'RAW',
          resource: {
            values: values,
          },
        });

        // Update the appraisal status to "Completed" in column F
        const statusUpdateRange = `${SHEET_NAME}!F${id}:F${id}`;
        const statusValues = [['Completed']];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: statusUpdateRange,
          valueInputOption: 'RAW',
          resource: {
            values: statusValues,
          },
        });

        res.json({ success: true, message: 'Appraisal completed successfully.' });
      } catch (error) {
        console.error('Error completing appraisal:', error);
        res.status(500).json({ success: false, message: 'Error completing appraisal.' });
      }
    });

    // Start the Server on All Interfaces
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    process.exit(1); // Exit if there's an initialization error
  }
}

startServer();
