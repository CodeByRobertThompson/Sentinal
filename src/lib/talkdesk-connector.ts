import type { TalkdeskAuthConfig, TalkdeskAuthResponse, TalkdeskSession, TalkdeskPollingResult } from '../models/talkdesk-models';


export class TalkdeskConnector {
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(private config: TalkdeskAuthConfig) {
    this.baseUrl = 'https://api.talkdeskapp.com';
  }


  public async authenticate(): Promise<void> {
    // Return early if we have a valid cached token to prevent rate limiting
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    const authPayload = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: authPayload.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TalkDesk Auth Failed: ${err}`);
    }

    const data: TalkdeskAuthResponse = await res.json();
    this.accessToken = data.access_token;
    // Buffer the expiry by 5 minutes to stay remarkably safe
    this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
  }

  /**
   * Instantiates the core chat conversation socket natively via the REST API
   */
  public async startChatSession(contextTitle: string = 'Sentinel Headless Interaction'): Promise<TalkdeskSession> {
    await this.authenticate();

    const res = await fetch(`${this.baseUrl}/chats/v1/sessions`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        guest_name: 'Sentinel Auto-Test',
        context: contextTitle
      })
    });

    if (!res.ok) throw new Error(`TalkDesk Session Creation Failed`);
    return res.json() as Promise<TalkdeskSession>;
  }

  /**
   * Formally inject a user message recursively into an existing session payload
   */
  public async sendMessage(sessionId: string, messageText: string): Promise<void> {
    await this.authenticate();

    const res = await fetch(`${this.baseUrl}/chats/v1/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message: messageText })
    });

    if (!res.ok) throw new Error(`Failed to transmit message payload.`);
  }

  /**
   * Aggressively recursively polls the chatbot endpoint mathematically calculating differences 
   * until the logical agent system physically replies to the user, strictly avoiding sleep hacks!
   */
  public async awaitBotResponse(sessionId: string, maxWaitMs = 15000): Promise<string> {
    await this.authenticate();
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // 1. Fire get request reading the dialogue history
      const res = await fetch(`${this.baseUrl}/chats/v1/sessions/${sessionId}/messages`, {
        method: "GET",
        headers: this.getAuthHeaders()
      });

      if (!res.ok) throw new Error("TalkDesk Polling Crash");

      const logData: TalkdeskPollingResult = await res.json();

      // 2. Identify the most recent system bounce
      const latestSystemChat = logData.messages.find(m => m.sender === 'system' || m.sender === 'agent');

      // 3. Prevent generic greeting grabs by checking timestamps against loop start internally
      if (latestSystemChat && new Date(latestSystemChat.timestamp).getTime() > startTime) {
        return latestSystemChat.message;
      }

      // Backoff recursively before checking again to prevent rate-limiting lockouts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Talkdesk Bot Response Timeout Exceeded.');
  }

  /**
   * Standardizes Token Injection across networking pipes 
   */
  private getAuthHeaders(): HeadersInit {
    if (!this.accessToken) throw new Error("Unauthenticated Native Status Error");
    return {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "x-account": this.config.accountName
    };
  }
}
