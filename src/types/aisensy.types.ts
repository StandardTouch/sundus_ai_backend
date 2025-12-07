/**
 * AI Sensy API Types
 * Types for WhatsApp message sending via AI Sensy
 */

/**
 * Phone number format (without country code prefix)
 * Example: "917676079163"
 */
export type PhoneNumber = string;

/**
 * Message types supported by AI Sensy API
 */
export type MessageType = "text" | "image" | "interactive" | "audio" | "document" | "sticker" | "location" | "contacts";

/**
 * Recipient type
 */
export type RecipientType = "individual" | "group";

/**
 * Quick reply button
 */
export interface QuickReplyButton {
  text: string;
  payload: string;
}

/**
 * Base message request (AI Sensy API format)
 */
export interface BaseMessageRequest {
  to: PhoneNumber;
  type: MessageType;
  recipient_type: RecipientType;
}

/**
 * Text message request (AI Sensy API format)
 */
export interface TextMessageRequest extends BaseMessageRequest {
  type: "text";
  text: {
    body: string;
  };
}

/**
 * Image message request (AI Sensy API format)
 */
export interface ImageMessageRequest extends BaseMessageRequest {
  type: "image";
  image: {
    link?: string;
    id?: string;
    caption?: string;
  };
}

/**
 * Interactive message request (for quick replies)
 */
export interface InteractiveMessageRequest extends BaseMessageRequest {
  type: "interactive";
  interactive: {
    type: "button" | "list";
    body?: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: "reply";
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

/**
 * Audio message request
 */
export interface AudioMessageRequest extends BaseMessageRequest {
  type: "audio";
  audio: {
    link?: string;
    id?: string;
  };
}

/**
 * Document message request
 */
export interface DocumentMessageRequest extends BaseMessageRequest {
  type: "document";
  document: {
    link?: string;
    id?: string;
    filename?: string;
    caption?: string;
  };
}

/**
 * Sticker message request
 */
export interface StickerMessageRequest extends BaseMessageRequest {
  type: "sticker";
  sticker: {
    link?: string;
    id?: string;
  };
}

/**
 * Location message request
 */
export interface LocationMessageRequest extends BaseMessageRequest {
  type: "location";
  location: {
    longitude: number;
    latitude: number;
    name?: string;
    address?: string;
  };
}

/**
 * Contact message request
 */
export interface ContactMessageRequest extends BaseMessageRequest {
  type: "contacts";
  contacts: Array<{
    name: {
      first_name: string;
      last_name?: string;
      formatted_name: string;
    };
    phones: Array<{
      phone: string;
      wa_id: string;
      type?: string;
    }>;
  }>;
}

/**
 * Union type for all message requests
 */
export type MessageRequest =
  | TextMessageRequest
  | ImageMessageRequest
  | InteractiveMessageRequest
  | AudioMessageRequest
  | DocumentMessageRequest
  | StickerMessageRequest
  | LocationMessageRequest
  | ContactMessageRequest;

/**
 * AI Sensy API response (actual format)
 */
export interface AISensyAPIResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

/**
 * Normalized response for our service
 */
export interface AISensyResponse {
  success: boolean;
  message_id?: string;
  wa_id?: string;
  error?: string;
  status?: number;
}

/**
 * Message details response from AI Sensy API
 */
export interface MessageDetails {
  type: string;
  id: string;
  meta_data: any[];
  project_id: string;
  phone_number: string;
  contact_id: string;
  campaign: any | null;
  sender: "USER" | "AGENT" | "SYSTEM";
  message_content: {
    text?: string;
    url?: string;
    urlExpiry?: string;
    mimeType?: string;
    callbackPayload?: string;
    longitude?: number;
    latitude?: number;
    address?: string;
    name?: string;
    contacts?: any[];
  };
  message_type: "TEXT" | "IMAGE" | "QUICK_REPLY" | "AUDIO" | "FILE" | "STICKER" | "LOCATION" | "CONTACT";
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  is_HSM: boolean;
  chatbot_response: any | null;
  agent_id: string | null;
  sent_at: number;
  delivered_at: number | null;
  read_at: number | null;
  failureResponse: any | null;
  userName: string;
  countryCode: string;
  submitted_message_id: string;
  message_price: number;
  deductionType: string | null;
  mau_details: any | null;
  whatsapp_conversation_details: {
    id: string;
    type: string;
  } | null;
  context: {
    from: string;
    id: string;
  } | null;
  messageId: string;
}

/**
 * Response for getting message details
 */
export interface MessageDetailsResponse {
  success: boolean;
  message?: MessageDetails;
  error?: string;
  status?: number;
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  phone_number: PhoneNumber;
  text?: string;
  image_url?: string;
  caption?: string;
  audio_url?: string;
  file_url?: string;
  sticker_url?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: ContactMessageRequest["contact"];
  quick_reply?: {
    text: string;
    buttons: QuickReplyButton[];
  };
}

