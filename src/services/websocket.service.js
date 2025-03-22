const WebSocket = require('ws');
const http = require('http');

let wss;
const clients = new Set();

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
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
        message: 'Connected to appraisals real-time updates'
      }
    }));
  });
  
  console.log('WebSocket server initialized');
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