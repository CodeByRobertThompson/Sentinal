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
  private readonly baseUrl = '/api/talkdesk';
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(private config: TalkdeskConfig) {
    // If a pre-issued bearer token was provided (and it's not a placeholder), use it immediately
    if (config.bearerToken && !config.bearerToken.startsWith('your_')) {
      this.accessToken = config.bearerToken;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // assume 24h validity
    }
  }

  // ─── Authentication ─────────────────────────────────────

  /**
   * Ensures a valid access token is available.
   * Skipped entirely if a bearer token was provided at construction.
   */
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

    // Talkdesk OAuth uses HTTP Basic auth: Base64(client_id:client_secret)
    const basicAuth = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    // OAuth endpoint is on a SEPARATE domain: {account}.talkdeskid.com
    const authUrl = `/api/talkdesk-auth/oauth/token`;

    console.log('[TalkDesk] Authenticating via OAuth...', { account: this.config.accountName });

    const res = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
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

  /**
   * POST /digital-connect/conversations
   * Creates a new conversation linked to the configured touchpoint.
   */
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

    console.log('[TalkDesk] Request headers:', JSON.stringify(headers));

    // Build request body with dynamic subject based on the test scenario
    const requestBody: Record<string, any> = {
      touchpoint_id: this.config.touchpointId,
      contact_person: {
        email: 'robert.95tt@gmail.com',
      },
      context_parameters: {
        contact_name: 'Robert Thompson-Tunstall',
        contact_phone: '+14014414682',
        contact_reason: 'Testing',
        website_location: 'https://wafdbank.com',
      },
    };

    // Add subject if provided — this helps Talkdesk route the conversation
    if (subject) {
      requestBody.subject = subject;
      console.log('[TalkDesk] Conversation subject:', subject);
    }

    const res = await fetch(`${this.baseUrl}/digital-connect/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[TalkDesk] Start conversation failed:', res.status, err);
      throw new Error(`Failed to start conversation (${res.status}): ${err}`);
    }

    return res.json() as Promise<TalkdeskConversation>;
  }

  // ─── Digital Connect: Messages ──────────────────────────

  /**
   * POST /digital-connect/conversations/{id}/messages
   * Sends a customer message into an active conversation.
   * Returns the conversation_id and message_id on success.
   */
  public async sendMessage(conversationId: string, text: string): Promise<{ conversation_id: string; message_id: string }> {
    await this.authenticate();

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.log(`[TalkDesk] Sending message to ${conversationId}: "${text}" (Key: ${idempotencyKey})`);

    const res = await fetch(
      `${this.baseUrl}/digital-connect/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          ...this.buildHeaders() as Record<string, string>,
          'x-idempotency-key': idempotencyKey,
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

  /**
   * DELETE /digital-connect/conversations/{id}
   * Ends an active conversation.
   */
  public async endConversation(conversationId: string): Promise<void> {
    await this.authenticate();

    console.log('[TalkDesk] Ending conversation:', conversationId);

    const res = await fetch(`${this.baseUrl}/digital-connect/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      console.error('[TalkDesk] End conversation failed:', res.status, err);
      // We don't necessarily want to throw here if it's already ended or something, 
      // but logging it is good.
    } else {
      console.log('[TalkDesk] Conversation ended successfully.');
    }
  }

  /**
   * Polls the local webhook server for the latest bot response.
   * Talkdesk uses webhooks to deliver bot responses.
   * Returns the text content of the *first new* bot message correctly.
   */
  public async awaitBotResponse(
    conversationId: string,
    maxWaitMs = 15000,
    pollIntervalMs = 1000
  ): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const azureUrl = (import.meta as any).env.VITE_AZURE_POLLING_URL;
        if (!azureUrl) throw new Error("Azure Polling URL not found in .env.local");

        // Polling the SharePoint Azure Logic App via POST
        const res = await fetch(azureUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId })
        });

        if (res.ok) {
          const json = await res.json();
          
          // If the Logic App Response just mapped straight to the 'value' array, json IS the array.
          // Otherwise, it might be nested inside json.value or json.data
          const messages = Array.isArray(json) ? json : (json.value || json.data || []);

          // Debug log so we can strictly verify what Azure is sending if it misses again
          if (messages.length > 0) {
            console.log('[TalkDesk] Azure Logic App returned messages:', messages);
          }

          // Find a bot message that was received after we started polling
          const botReply = messages.find(
            (m: any) => {
              // Support both the original local Node structure and SharePoint camelCase structure
              const senderType = m.SenderType || m.sender_type;
              
              // If SharePoint didn't create a custom Timestamp column, use the system Created column
              const timestamp = m.Timestamp || m.created_at || m.Created || new Date().toISOString();
              
              // Only consider it if it's from the bot. (We skip timestamp validation temporarily if missing)
              const timeValid = timestamp ? new Date(timestamp).getTime() >= startTime : true;
              return senderType?.toLowerCase() === 'bot' && timeValid;
            }
          );

          if (botReply) {
            return botReply.Content || botReply.content;
          }
        }
      } catch (err: any) {
        // Log gracefully during polling
        console.warn('[TalkDesk] Failed to poll Azure Logic App (will retry):', err.message);
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
      'x-account': this.config.accountName
    };
  }
}

// ─── Factory ──────────────────────────────────────────────

/**
 * Creates a TalkdeskConnector pre-configured from environment variables.
 * Usage: const td = createTalkdeskConnector();
 */
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
