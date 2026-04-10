const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json()); // body parser

// In-memory store for received messages mapped by conversation_id
// Structure: { [conversationId: string]: Array<{ content: string, sender_type: string, created_at: string }> }
const conversationMessages = {};

// 1. Webhook endpoint for Talkdesk Connect to POST to.
app.post(['/webhook/talkdesk', '/webchat'], (req, res) => {
  console.log(`[Webhook Server] Received event on ${req.path}:`, JSON.stringify(req.body, null, 2));
  
  // The structure of the `message_created` event from Talkdesk Connections
  // You might need to adjust this depending on the exact payload Talkdesk sends.
  // We assume Talkdesk sends: { conversation_id, content, sender_type, created_at } or similar event data.

  const body = req.body;
  // Fallback to various known shapes that Webhooks might use
  const conversationId = body.conversation_id || (body.payload && body.payload.conversation_id) || body.interaction_id;
  const content = body.content || (body.payload && body.payload.content) || body.message;
  
  let senderType = body.sender_type || (body.payload && body.payload.author && body.payload.author.type) || 'bot';
  // Standardize sender string
  if (senderType.toLowerCase().includes('bot') || senderType.toLowerCase().includes('agent')) {
    senderType = 'bot';
  } else {
    senderType = 'customer';
  }
  
  const createdAt = body.created_at || (body.data && body.data.created_at) || new Date().toISOString();

  if (conversationId && content && senderType === 'bot') {
    if (!conversationMessages[conversationId]) {
      conversationMessages[conversationId] = [];
    }
    
    conversationMessages[conversationId].push({
      content,
      sender_type: senderType,
      created_at: createdAt
    });

    console.log(`[Webhook Server] Captured message for ${conversationId}: "${content}"`);
  }

  // Some free tunnels like localtunnel throw 502 Bad Gateway when responding with an empty body
  // Sending a physical JSON payload fixes the upstream proxy pipe error!
  res.status(200).json({ success: true, message: "Received by local server" });
});

// 2. Endpoint for React dashboard to poll for messages
app.get('/api/messages/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const messages = conversationMessages[conversationId] || [];
  res.json({ data: messages });
});

// Clear messages for a conversation (useful for testing cleanup)
app.delete('/api/messages/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  delete conversationMessages[conversationId];
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Webhook server running on http://localhost:${port}`);
  console.log(`   - Frontend polling UI: http://localhost:${port}/api/messages/:conversationId`);
  console.log(`   - Webhook ingress URL: http://localhost:${port}/webhook/talkdesk`);
  console.log(`   - Talkdesk REST Proxy: http://localhost:${port}/proxy/talkdesk`);
  console.log(`\nTo expose to internet, run: ngrok http ${port}`);
  console.log(`=================================================\n`);
});

// ─── Native NodeJS Proxy for Vercel ─────────────────────────
// This bypasses Vercel's Host header preservation which historically causes Talkdesk 404s
app.all('/proxy/talkdesk/*', async (req, res) => {
  try {
    const isAuth = req.path.includes('/oauth/token');
    const targetUrl = isAuth 
      ? `https://${req.headers['x-account'] || 'wafd-sb'}.talkdeskid.com/oauth/token`
      : `https://api.talkdeskapp.com${req.path.replace('/proxy/talkdesk', '')}`;
      
    const options = {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': req.headers['content-type'],
        'x-idempotency-key': req.headers['x-idempotency-key'],
      }
    };
    
    // Purge undefined headers to prevent node fetch errors
    Object.keys(options.headers).forEach(k => options.headers[k] === undefined && delete options.headers[k]);

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;
      // Handle x-www-form-urlencoded for OAuth mapping seamlessly
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
         options.body = new URLSearchParams(req.body).toString();
      }
    }

    const response = await fetch(targetUrl, options);
    const data = await response.text();
    
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
});
