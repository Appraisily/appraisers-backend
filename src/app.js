const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeConfig } = require('./config');
const routes = require('./routes');

const app = express();

const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

async function startServer() {
  try {
    await initializeConfig();
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing configuration:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;