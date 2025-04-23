const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Store connected clients
const clients = new Map();

/**
 * Initialize WebSocket server
 * @param {Server} server - HTTP/HTTPS server instance
 * @returns {WebSocket.Server} - WebSocket server instance
 */
function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const ip = req.socket.remoteAddress;
    
    console.log(`[WebSocket] Client connected: ${clientId} from ${ip}`);
    
    // Store client with metadata
    clients.set(ws, {
      id: clientId,
      ip,
      connectedAt: new Date()
    });

    // Handle messages
    ws.on('message', (message) => {
      try {
        const messageData = JSON.parse(message);
        console.log(`[WebSocket] Message from ${clientId}:`, messageData.type);
        
        // Handle different message types
        handleMessage(ws, messageData);
      } catch (error) {
        console.error(`[WebSocket] Error processing message from ${clientId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle disconnections
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      clients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to Appraisers WebSocket server'
    }));
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} client - WebSocket client
 * @param {Object} message - Parsed message object
 */
function handleMessage(client, message) {
  switch (message.type) {
    case 'ping':
      client.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
    
    default:
      client.send(JSON.stringify({
        type: 'error',
        message: `Unsupported message type: ${message.type}`
      }));
      break;
  }
}

/**
 * Broadcast message to all connected clients
 * @param {Object} message - Message to broadcast
 */
function broadcast(message) {
  const messageString = JSON.stringify(message);
  clients.forEach((metadata, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

/**
 * Send message to specific client
 * @param {string} clientId - Client ID
 * @param {Object} message - Message to send
 * @returns {boolean} - Whether message was sent successfully
 */
function sendToClient(clientId, message) {
  for (const [client, metadata] of clients.entries()) {
    if (metadata.id === clientId) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        return true;
      }
      return false;
    }
  }
  return false;
}

module.exports = {
  initWebSocket,
  broadcast,
  sendToClient
}; 