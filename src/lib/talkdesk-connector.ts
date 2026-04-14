import type {
  TalkdeskConfig,
  TalkdeskAuthResponse,
  TalkdeskConversation,
} from '../models/talkdesk-models';

/**
 * TalkDesk Digital Connect Connector
 *
 * Manages the full lifecycle of a Digital Connect conversation:
 *   1. Authenticate (bearer token or OAuth client_credentials)
 *   2. Start a conversation against a specific touchpoint
 *   3. Send customer messages
 *   4. Poll for bot/agent responses
 */
export class TalkdeskConnector {
  private get baseUrl(): string {
    const isVercel = (import.meta as any).env.PROD;
    if (isVercel) {
      return 'https://api.talkdeskapp.com';
    }
    const webhookUrl = (import.meta as any).env.VITE_WEBHOOK_URL;
    return webhookUrl ? `${webhookUrl}/proxy/talkdesk` : '/api/talkdesk';
  }

  private get authUrl(): string {
    const isVercel = (import.meta as any).env.PROD;
    if (isVercel) {
      return `https://${this.config.accountName}.talkdeskid.com/oauth/token`;
    }
    const webhookUrl = (import.meta as any).env.VITE_WEBHOOK_URL;
    return webhookUrl ? `${webhookUrl}/proxy/talkdesk/oauth/token` : '/api/talkdesk-auth/oauth/token';
  }

  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private cursor: Record<string, number> = {};
  private seenTimestamps: Record<string, Set<string>> = {};

  constructor(private config: TalkdeskConfig) {
    // If a pre-issued bearer token was provided (and it's not a placeholder), use it immediately
    if (config.bearerToken && !config.bearerToken.startsWith('your_')) {
      this.accessToken = config.bearerToken;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // assume 24h validity
    }
  }

  // ─── Authentication ─────────────────────────────────────

  public async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        'Token expired or missing. Provide a new bearerToken or configure OAuth (clientId + clientSecret).'
      );
    }

    if (!this.config.accountName) {
      throw new Error(
        'Account name is required for OAuth. Set VITE_TALKDESK_ACCOUNT_NAME in .env.local.'
      );
    }

    const basicAuth = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

    console.log('[TalkDesk] Authenticating via OAuth...', { account: this.config.accountName });

    const isVercel = (import.meta as any).env.PROD;
    const fetchTarget = isVercel ? '/api/proxy' : this.authUrl;

    const res = await fetch(fetchTarget, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'ngrok-skip-browser-warning': 'true',
        'x-target-url': this.authUrl 
      },
      body: body.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[TalkDesk] OAuth failed:', res.status, err);
      throw new Error(`TalkDesk OAuth failed (${res.status}): ${err}`);
    }

    const data: TalkdeskAuthResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
    console.log('[TalkDesk] OAuth succeeded, token expires in', data.expires_in, 'seconds');
  }

  // ─── Digital Connect: Conversations ─────────────────────

  public async startConversation(subject?: string): Promise<TalkdeskConversation> {
    await this.authenticate();

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.log('[TalkDesk] Starting conversation with idempotency key:', idempotencyKey);

    const headers: Record<string, string> = {
      ...this.buildHeaders() as Record<string, string>,
      'x-idempotency-key': idempotencyKey,
    };

    const requestBody: Record<string, any> = {
      touchpoint_id: this.config.touchpointId,
      contact_person: { email: 'robert.95tt@gmail.com' },
      context_parameters: {
        contact_name: 'Robert Thompson-Tunstall',
        contact_phone: '+14014414682',
        contact_reason: 'Testing',
        website_location: 'https://wafdbank.com',
      },
    };

    if (subject) {
      requestBody.subject = subject;
    }

    const isVercel = (import.meta as any).env.PROD;
    const targetEndpoint = `${this.baseUrl}/digital-connect/conversations`;
    const fetchTarget = isVercel ? '/api/proxy' : targetEndpoint;

    const res = await fetch(fetchTarget, {
      method: 'POST',
      headers: {
        ...headers,
        'x-target-url': targetEndpoint
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[TalkDesk] Start conversation failed:', res.status, err);
      throw new Error(`Failed to start conversation (${res.status}): ${err}`);
    }

    const conversation = await res.json() as TalkdeskConversation;
    if (conversation && conversation.id) {
       this.cursor[conversation.id] = 0;
       this.seenTimestamps[conversation.id] = new Set();
    }
    return conversation;
  }

  // ─── Digital Connect: Messages ──────────────────────────

  public async sendMessage(conversationId: string, text: string): Promise<{ conversation_id: string; message_id: string }> {
    await this.authenticate();

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.log(`[TalkDesk] Sending message to ${conversationId}: "${text}" (Key: ${idempotencyKey})`);

    const isVercel = (import.meta as any).env.PROD;
    const targetEndpoint = `${this.baseUrl}/digital-connect/conversations/${conversationId}/messages`;
    const fetchTarget = isVercel ? '/api/proxy' : targetEndpoint;

    const res = await fetch(fetchTarget, {
        method: 'POST',
        headers: {
          ...this.buildHeaders() as Record<string, string>,
          'x-idempotency-key': idempotencyKey,
          'x-target-url': targetEndpoint
        },
        body: JSON.stringify({ content: text })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[TalkDesk] Send message failed:', res.status, err);
      throw new Error(`Failed to send message (${res.status}): ${err}`);
    }

    const data = await res.json();
    console.log('[TalkDesk] Message sent successfully. ID:', data.message_id);
    return data;
  }

  public async endConversation(conversationId: string): Promise<void> {
    await this.authenticate();

    const isVercel = (import.meta as any).env.PROD;
    const targetEndpoint = `${this.baseUrl}/digital-connect/conversations/${conversationId}`;
    const fetchTarget = isVercel ? '/api/proxy' : targetEndpoint;

    const res = await fetch(fetchTarget, {
      method: 'DELETE',
      headers: {
        ...this.buildHeaders(),
        'x-target-url': targetEndpoint
      }
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      console.error('[TalkDesk] End conversation failed:', res.status, err);
    } else {
      console.log('[TalkDesk] Conversation ended successfully.');
    }
  }

  public async awaitBotResponse(
    conversationId: string,
    maxWaitMs = 15000,
    pollIntervalMs = 1000
  ): Promise<string> {
    const startTime = Date.now();
    const cursorIndex = this.cursor[conversationId] || 0;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const webhookUrl = (import.meta as any).env.VITE_WEBHOOK_URL || 'http://localhost:3001';
        const isVercel = (import.meta as any).env.PROD;
        const targetEndpoint = `${webhookUrl}/api/messages/${conversationId}`;
        const fetchTarget = isVercel ? '/api/proxy' : targetEndpoint;

        const res = await fetch(fetchTarget, {
          method: 'GET',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'x-target-url': targetEndpoint
          }
        });

        if (res.ok) {
          const json = await res.json();
          const messages = json.data || json;
          
          if (messages && messages.length > cursorIndex) {
            console.log(`[TalkDesk] Webhook Check: Server holds ${messages.length} messages (Cursor: ${cursorIndex})`);
          }

          const newBotMessages = messages.slice(cursorIndex).filter(
            (m: any) => {
              const senderType = m.sender_type || m.SenderType;
              return senderType?.toLowerCase() === 'bot';
            }
          );

          if (newBotMessages.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const debounceRes = await fetch(fetchTarget, {
              method: 'GET',
              headers: { 
                'ngrok-skip-browser-warning': 'true',
                'x-target-url': targetEndpoint
              }
            });
            
            if (debounceRes.ok) {
               const finalJson = await debounceRes.json();
               const finalMsgs = finalJson.data || finalJson;
               
               this.cursor[conversationId] = finalMsgs.length;
               
               const finalBotSequence = finalMsgs.slice(cursorIndex).filter(
                 (m: any) => {
                   const sType = m.sender_type || m.SenderType;
                   const isBot = sType?.toLowerCase() === 'bot';
                   if (!isBot) return false;
                   
                   const tstamp = m.created_at || m.Timestamp;
                   if (tstamp && this.seenTimestamps[conversationId]?.has(tstamp)) {
                      return false;
                   }
                   if (tstamp && this.seenTimestamps[conversationId]) {
                      this.seenTimestamps[conversationId].add(tstamp);
                   }
                   return true;
                 }
               );
               
               const rawContents = finalBotSequence.map((m: any) => (m.content || m.Content || '').trim()).filter(Boolean);
               const uniqueContents = Array.from(new Set(rawContents));
               
               return uniqueContents.join('\n\n');
            }

            this.cursor[conversationId] = messages.length;
            const fallbackContents = newBotMessages.map((m: any) => (m.content || m.Content || '').trim()).filter(Boolean);
            return Array.from(new Set(fallbackContents)).join('\n\n');
          }
        }
      } catch (err: any) {
        console.warn('[TalkDesk] Failed to poll local webhook server (will retry):', err.message);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Bot did not respond within ${maxWaitMs / 1000}s. (Ensure Talkdesk Connections is sending to your webhook.)`);
  }

  // ─── Internals ──────────────────────────────────────────

  private buildHeaders(): HeadersInit {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() or provide a bearerToken.');
    }
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'x-account': this.config.accountName,
      'ngrok-skip-browser-warning': 'true'
    };
  }
}

// ─── Factory ──────────────────────────────────────────────

export function createTalkdeskConnector(): TalkdeskConnector {
  const env = (import.meta as any).env;

  return new TalkdeskConnector({
    bearerToken: env.VITE_TALKDESK_BEARER_TOKEN || undefined,
    clientId: env.VITE_TALKDESK_CLIENT_ID || undefined,
    clientSecret: env.VITE_TALKDESK_CLIENT_SECRET || undefined,
    accountName: env.VITE_TALKDESK_ACCOUNT_NAME || '',
    touchpointId: env.VITE_TALKDESK_TOUCHPOINT_ID || ''
  });
}
