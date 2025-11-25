// TypeScript interfaces for AI Sensy webhook payloads

export interface BaseWebhookPayload {
  id: string;
  created_at: string;
  topic: string;
  project_id: string;
  delivery_attempt: string;
  data: {
    message: Message;
  };
}

export interface Message {
  type: string;
  id: string;
  meta_data: any[];
  project_id: string;
  phone_number: string;
  contact_id: string;
  campaign: Campaign | null;
  sender: string;
  message_content: MessageContent;
  message_type: MessageType;
  status: string;
  is_HSM: boolean;
  chatbot_response: null;
  agent_id: null;
  sent_at: number;
  delivered_at: number;
  read_at: number | null;
  failureResponse: Record<string, any>;
  userName: string;
  countryCode: string;
  submitted_message_id: string;
  message_price: number;
  deductionType: null;
  mau_details: null;
  whatsapp_conversation_details: null;
  context: MessageContext | null;
  messageId: string;
}

export type MessageType =
  | "TEXT"
  | "QUICK_REPLY"
  | "IMAGE"
  | "FILE"
  | "AUDIO"
  | "STICKER"
  | "LOCATION"
  | "CONTACT";

export interface Campaign {
  name: string;
  _id: string;
}

export interface MessageContext {
  from: string;
  id: string;
}

// Message Content Types
export interface TextMessageContent {
  text: string;
}

export interface QuickReplyMessageContent {
  text: string;
  callbackPayload: string;
}

export interface MediaMessageContent {
  url: string;
  urlExpiry: string;
  mimeType: string;
}

export interface LocationMessageContent {
  longitude: number;
  latitude: number;
  address: string;
  name: string;
  url: string;
}

export interface ContactMessageContent {
  contacts: Array<{
    name: {
      first_name: string;
      last_name: string;
      formatted_name: string;
    };
    phones: Array<{
      phone: string;
      wa_id: string;
      type: string;
    }>;
  }>;
}

export type MessageContent =
  | TextMessageContent
  | QuickReplyMessageContent
  | MediaMessageContent
  | LocationMessageContent
  | ContactMessageContent;

// Request types for configuring webhooks
export interface WebhookConfig {
  message_type: MessageType;
  phone_number?: string;
  contact_id?: string;
  userName?: string;
  countryCode?: string;
  project_id?: string;
  // Message content overrides
  text?: string;
  callbackPayload?: string;
  url?: string;
  mimeType?: string;
  longitude?: number;
  latitude?: number;
  address?: string;
  locationName?: string;
  contactName?: {
    first_name?: string;
    last_name?: string;
    formatted_name?: string;
  };
  contactPhone?: {
    phone?: string;
    wa_id?: string;
    type?: string;
  };
  // Context for replies/quick replies
  context?: MessageContext;
  // Campaign for replied messages
  campaign?: Campaign;
  // Custom fields
  [key: string]: any;
}

