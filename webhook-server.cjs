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
app.post('/webhook/talkdesk', (req, res) => {
  console.log('[Webhook Server] Received event:', JSON.stringify(req.body, null, 2));
  
  // The structure of the `message_created` event from Talkdesk Connections
  // You might need to adjust this depending on the exact payload Talkdesk sends.
  // We assume Talkdesk sends: { conversation_id, content, sender_type, created_at } or similar event data.

  const body = req.body;
  // Fallback to various known shapes that Webhooks might use
  const conversationId = body.conversation_id || body.interaction_id || (body.data && body.data.conversation_id);
  const content = body.content || body.message || (body.data && body.data.content);
  
  let senderType = body.sender_type || (body.data && body.data.sender_type) || 'bot';
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

  // Always respond 200 OK so Talkdesk knows we received it
  res.sendStatus(200);
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
  console.log(`\nTo expose to internet, run: ngrok http ${port}`);
  console.log(`=================================================\n`);
});
