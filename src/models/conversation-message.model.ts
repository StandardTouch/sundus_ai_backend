/**
 * Conversation Message Model
 * MongoDB schema for storing conversation messages (last 20 per user)
 */

export interface ConversationMessage {
  _id?: string;
  
  // User identification
  phone_number: string;              // User's phone number
  
  // Message identification
  message_id: string;                // AI Sensy message ID (unique)
  
  // Message content
  role: 'user' | 'assistant';        // Message role
  content: string;                   // Message text content
  
  // Reply context
  replied_to_message_id?: string;     // If reply, original message ID
  
  // Timestamps
  timestamp: Date;                   // Message timestamp
  
  // Metadata
  metadata?: {
    tool_calls?: any[];               // Tool calls made (if assistant)
    feedback?: 'yes' | 'no';          // User feedback (if user)
    model?: string;                   // OpenAI model used (if assistant)
    tokens_used?: number;             // Tokens used for this message
    [key: string]: any;               // Additional metadata
  };
}

/**
 * Create Conversation Message DTO
 */
export interface CreateConversationMessageDto {
  phone_number: string;
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  replied_to_message_id?: string;
  metadata?: ConversationMessage['metadata'];
}

/**
 * Conversation Message Response (for API)
 */
export interface ConversationMessageResponse {
  _id: string;
  phone_number: string;
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  replied_to_message_id?: string;
  timestamp: Date;
  metadata?: ConversationMessage['metadata'];
}

