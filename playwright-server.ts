import express from 'express';
import cors from 'cors';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

interface Session {
  page: Page;
  browser: Browser;
  context: BrowserContext;
  sentMessages: Set<string>;
}

const sessions: Record<string, Session> = {};

app.post('/api/browser/start', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing required `url` property in body' });
  }

  try {
    console.log(`[Playwright] Launching browser to navigate to: ${url}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      // Optional: Reduce permissions or setup specific state here
    });
    const page = await context.newPage();
    
    // Set a custom user agent to denote automation if needed
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    
    console.log(`[Playwright] Page loaded. Searching for chat trigger.`);
    
    // Wait for the float widget root container injected by Talkdesk
    const toggle = page.locator('#talkdesk-chat-widget-float');
    await toggle.waitFor({ state: 'attached', timeout: 15000 });
    // Click it to open the window
    await toggle.click({ force: true, position: { x: 20, y: 20 } });
    console.log(`[Playwright] Clicked chat trigger.`);

    // Wait for the chat text area inside the main widget iframe
    const chatFrame = page.frameLocator('iframe[src*="index.html"]');
    const input = chatFrame.locator('textarea[name="text"]');
    await input.waitFor({ state: 'visible', timeout: 15000 });
    console.log(`[Playwright] Input field ready. Session established.`);

    const id = crypto.randomUUID();
    sessions[id] = { page, browser, context, sentMessages: new Set() };
    res.json({ id, status: 'started' });
  } catch (error: any) {
    console.error(`[Playwright] Start session failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/browser/:id/messages', async (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).send('Session not found');
  
  try {
    const { content } = req.body;
    console.log(`[Playwright] User sending message: "${content}"`);
    
    const chatFrame = session.page.frameLocator('iframe[src*="index.html"]');
    const input = chatFrame.locator('textarea[name="text"]');
    
    // Use pressSequentially to simulate real Native human typing.
    // React chat widgets often ignore .fill() and fail to remove the "disabled" state from the Send Button natively!
    await input.clear();
    await input.pressSequentially(content, { delay: 5 });
    
    // Attempt to explicitly click the native "Send message" button to evade newline issues in textareas
    try {
      const sendButton = chatFrame.locator('[data-testid="send-message-button"]');
      await sendButton.click({ timeout: 2000, force: true });
    } catch (e) {
      // Fallback
      await input.press('Enter');
    }
    
    // Log what we sent so we can filter it out of the transcript if needed
    session.sentMessages.add(content.trim());
    
    res.json({ success: true, message_id: crypto.randomUUID() });
  } catch (error: any) {
    console.error(`[Playwright] Send message failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/browser/:id/messages', async (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const frame = session.page.frames().find(f => f.url().includes('index.html'));
    if (!frame) return res.json({ data: [] });

    // Evaluate the DOM to extract all messages in the chat window.
    const extractedData = await frame.evaluate(() => {
      const messages: { content: string, senderClass: string }[] = [];
      const contentElements = document.querySelectorAll('[data-chat-bubble-type], .chat-message--content');
      
      contentElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        // Ignore structural empty tags and tiny unhelpful UI strings
        if (text && text.length > 0) {
          let wrapper = el.parentElement;
          let wrapperClasses = '';
          while (wrapper && wrapper.tagName.toLowerCase() !== 'body') {
            wrapperClasses += (wrapper.className || '') + ' ';
            wrapper = wrapper.parentElement;
          }
          
          messages.push({
            content: text,
            senderClass: wrapperClasses.toLowerCase()
          });
        }
      });
      // Deduplicate texts quickly
      return messages.filter((m, i, arr) => i === 0 || m.content !== arr[i-1].content);
    });

    const data = extractedData.map((msg, index) => {
      const isUser = msg.senderClass.includes('visitor') || msg.senderClass.includes('author-customer') || msg.senderClass.includes('sent') || msg.senderClass.includes('user');
      
      return {
        content: msg.content,
        sender_type: isUser ? 'customer' : 'bot',
        created_at: new Date(Date.now() - (1000 * (extractedData.length - index))).toISOString()
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error(`[Playwright] Polling failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/browser/:id', async (req, res) => {
  const session = sessions[req.params.id];
  if (session) {
    console.log(`[Playwright] Ending session. Closing browser.`);
    await session.browser.close().catch(() => {});
    delete sessions[req.params.id];
  }
  res.sendStatus(204);
});

app.listen(port, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Playwright Headless Server running on http://localhost:${port}`);
  console.log(`   - Frontend Interface: /api/browser/...`);
  console.log(`=================================================\n`);
});
