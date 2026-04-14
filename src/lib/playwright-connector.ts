import type {
  TalkdeskConversation,
} from '../models/talkdesk-models';

/**
 * Playwright DOM Connector
 *
 * Exposes the EXACT same interface as TalkdeskConnector but routes
 * API calls to our local Playwright Server (running on port 3002).
 */
export class PlaywrightConnector {
  private get baseUrl(): string {
    const isVercel = (import.meta as any).env.PROD;
    const webhookUrl = (import.meta as any).env.VITE_WEBHOOK_URL;
    return (isVercel && webhookUrl) ? `${webhookUrl}/api/browser` : 'http://localhost:3002/api/browser';
  }
  private cursor: Record<string, number> = {};
  private targetUrl: string;

  constructor(targetUrl: string) {
    this.targetUrl = targetUrl;
  }

  // 1. Authenticate (No-Op for Playwright, but required for interface)
  public async authenticate(): Promise<void> {
    console.log('[Playwright] Authentication step bypassed for Mock UI testing.');
  }

  // 2. Start Conversation (Launches Chromium)
  public async startConversation(subject?: string): Promise<TalkdeskConversation> {
    console.log('[Playwright] Launching UI Test Session using Playwright...', { subject });

    const res = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' 
      },
      body: JSON.stringify({ url: this.targetUrl, subject })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to start Playwright session: ${err}`);
    }

    const data = await res.json();
    this.cursor[data.id] = 0;

    return {
      id: data.id,
      touchpoint_id: 'playwright-mock-touchpoint',
      contact_id: 'playwright-mock',
      status: 'active',
      created_at: new Date().toISOString()
    } as TalkdeskConversation;
  }

  // 3. Send Message (Types into Mock Website DOM)
  public async sendMessage(conversationId: string, text: string): Promise<{ conversation_id: string; message_id: string }> {
    console.log(`[Playwright] Texting bot: "${text}"`);
    
    // In our specific mock website, the first automated chat window interaction 
    // requires closing logic if it has overlays or popups. Our browser server handles that.
    
    const res = await fetch(`${this.baseUrl}/${conversationId}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ content: text })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to send message via Playwright: ${err}`);
    }

    const data = await res.json();
    return {
      conversation_id: conversationId,
      message_id: data.message_id
    };
  }

  // 4. End Conversation (Closes Chromium)
  public async endConversation(conversationId: string): Promise<void> {
    console.log('[Playwright] Closing browser session:', conversationId);

    await fetch(`${this.baseUrl}/${conversationId}`, { 
      method: 'DELETE',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
  }

  // 5. Await Bot Response (Polls DOM via Playwright server)
  public async awaitBotResponse(
    conversationId: string,
    maxWaitMs = 15000,
    pollIntervalMs = 1000
  ): Promise<string> {
    const startTime = Date.now();
    const cursorIndex = this.cursor[conversationId] || 0;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const res = await fetch(`${this.baseUrl}/${conversationId}/messages`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        if (res.ok) {
          const json = await res.json();
          const messages = json.data;
          
          if (messages && messages.length > cursorIndex) {
            const newBotMessages = messages.slice(cursorIndex).filter(
              (m: any) => m.sender_type.toLowerCase() === 'bot'
            );

            if (newBotMessages.length > 0) {
              // Wait slightly for delayed 2nd bubbles
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const finalRes = await fetch(`${this.baseUrl}/${conversationId}/messages`, {
                headers: {
                  'ngrok-skip-browser-warning': 'true'
                }
              });
              if (finalRes.ok) {
                const finalJson = await finalRes.json();
                const finalMsgs = finalJson.data;
                this.cursor[conversationId] = finalMsgs.length;
                
                const finalBotSequence = finalMsgs.slice(cursorIndex).filter(
                  (m: any) => m.sender_type.toLowerCase() === 'bot'
                );
                
                const rawContents = finalBotSequence.map((m: any) => m.content.trim()).filter(Boolean);
                const uniqueContents = Array.from(new Set(rawContents));
                return uniqueContents.join('\n\n');
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Playwright] Playwright HTTP Server poll failed:', err.message);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Bot did not respond within ${maxWaitMs / 1000}s. Check the browser window to see if it's stuck.`);
  }
}
