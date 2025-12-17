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
export type MessageType = "text" | "image" | "interactive" | "audio" | "document" | "template";

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
 * Template parameter types
 */
export type TemplateParameterType = "text" | "currency" | "date_time" | "image" | "document" | "video";

/**
 * Template parameter
 */
export interface TemplateParameter {
  type: TemplateParameterType;
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link?: string;
    id?: string;
  };
  document?: {
    link?: string;
    id?: string;
    filename?: string;
  };
  video?: {
    link?: string;
    id?: string;
  };
}

/**
 * Template component
 */
export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
  sub_type?: "url" | "quick_reply" | "text";
  index?: number | string; // Can be number or string (API accepts both)
}

/**
 * Template message request (HSM - Highly Structured Messages)
 */
export interface TemplateMessageRequest {
  to: PhoneNumber;
  type: "template";
  // Note: recipient_type is NOT included for template messages per AISensy API
  template: {
    language: {
      policy: "deterministic" | "fallback";
      code: string; // e.g., "en_us", "ar", "en"
    };
    name: string;
    components?: TemplateComponent[];
  };
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
  | TemplateMessageRequest;

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
  quick_reply?: {
    text: string;
    buttons: QuickReplyButton[];
  };
}

