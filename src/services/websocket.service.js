const WebSocket = require('ws');
const http = require('http');
const https = require('https');

let wss;
const clients = new Set();
let pingInterval;

/**
 * Initialize WebSocket server
 * @param {http.Server|https.Server} server - HTTP or HTTPS server instance
 */
const initWebSocket = (server) => {
  // Determine if running in secure mode (either production or with SSL certificates)
  const isSecure = process.env.NODE_ENV === 'production' || 
                  process.env.SECURE === 'true' || 
                  (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH);
  
  // Create WebSocket server with proper options
  wss = new WebSocket.Server({ 
    server,
    // Additional security options for production
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options are used to limit memory usage
      concurrencyLimit: 10,
      threshold: 1024 // Size in bytes below which messages are not compressed
    }
  });
  
  wss.on('connection', (ws, req) => {
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.socket.remoteAddress;
    console.log(`New WebSocket client connected from ${clientIp}`);
    
    // Add isAlive property for ping-pong mechanism
    ws.isAlive = true;
    
    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle client messages (can be used for ping)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (e) {
        // Ignore parsing errors, might be a binary message
      }
    });
    
    clients.add(ws);
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        message: 'Connected to appraisals real-time updates',
        protocol: isSecure ? 'WSS' : 'WS',
        timestamp: new Date().toISOString()
      }
    }));
  });
  
  // Set up a ping-pong interval to keep connections alive
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000); // Send ping every 30 seconds
  
  // Handle server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  console.log(`WebSocket server initialized (${isSecure ? 'Secure/WSS' : 'Insecure/WS'} mode)`);
  return wss;
};

/**
 * Broadcast appraisal status update to all connected clients
 * @param {Object} appraisal - The updated appraisal object
 */
const broadcastStatusUpdate = (appraisal) => {
  if (!wss || clients.size === 0) {
    console.log('No WebSocket clients connected, skipping broadcast');
    return;
  }
  
  const message = JSON.stringify({
    type: 'appraisal_update',
    payload: {
      id: appraisal.id,
      status: appraisal.status,
      customerName: appraisal.customerName,
      customerEmail: appraisal.customerEmail,
      date: appraisal.date || new Date().toISOString(),
      identifier: appraisal.identifier,
      sessionId: appraisal.sessionId,
      appraisalType: appraisal.appraisalType || 'Standard',
      wordpressUrl: appraisal.wordpressUrl
    }
  });
  
  let clientCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });
  
  console.log(`Broadcast status update to ${clientCount} clients for appraisal ID: ${appraisal.id}`);
};

/**
 * Get the current WebSocket server instance
 * @returns {WebSocket.Server} The WebSocket server instance
 */
const getWebSocketServer = () => wss;

/**
 * Get the number of connected clients
 * @returns {number} Count of connected clients
 */
const getConnectedClientCount = () => clients.size;

module.exports = {
  initWebSocket,
  broadcastStatusUpdate,
  getWebSocketServer,
  getConnectedClientCount
};