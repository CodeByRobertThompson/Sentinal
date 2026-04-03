// TalkDesk Core Models mapping to standard Conversations/Chat endpoints

export interface TalkdeskAuthConfig {
  clientId: string;
  clientSecret: string;
  accountName: string; // The specific subdomain or account slug typically required
}

export interface TalkdeskAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TalkdeskSession {
  id: string;   // The uniquely generated Conversation/Chat ID
  status: string;
  created_at: string;
}

export interface TalkdeskMessage {
  id: string;
  message: string;
  sender: 'user' | 'system' | 'agent';
  timestamp: string;
}

export interface TalkdeskPollingResult {
  messages: TalkdeskMessage[];
}
