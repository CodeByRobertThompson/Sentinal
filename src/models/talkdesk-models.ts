// TalkDesk Digital Connect Models

export interface TalkdeskConfig {
  /** Pre-issued bearer token */
  bearerToken?: string;
  /** Only needed if using OAuth client_credentials flow */
  clientId?: string;
  clientSecret?: string;
  /** The account name (slug) for your TalkDesk instance */
  accountName: string;
  /** The touchpoint ID assigned to your Digital Connect channel */
  touchpointId: string;
}

export interface TalkdeskAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Returned when starting a new Digital Connect conversation */
export interface TalkdeskConversation {
  id: string;
  touchpoint_id: string;
  contact_id: string;
  status: string;
  created_at: string;
}

/** A single message in the conversation */
export interface TalkdeskMessage {
  id: string;
  /** The text content of the message */
  content: string;
  /** 'customer' = us (the tester), 'bot' or 'agent' = TalkDesk side */
  sender_type: 'customer' | 'bot' | 'agent';
  created_at: string;
}

/** Response shape when listing messages in a conversation */
export interface TalkdeskMessageListResponse {
  data: TalkdeskMessage[];
}
