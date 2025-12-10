/**
 * Conversation Message Model
 * MongoDB schema for storing conversation messages (last 20 per user)
 */

export interface ConversationMessage {
  _id?: string;
  
  // User identification
  phone_number: string;              // User's phone number
  
  // Conversation tracking
  conversation_id?: string;          // Unique ID for conversation thread/session
  
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
    response_time_ms?: number;        // Total response time (webhook to response sent)
    openai_time_ms?: number;          // Time spent in OpenAI API
    processing_time_ms?: number;      // Other processing time
    accuracy_score?: number;          // Response accuracy (0-1 or percentage)
    was_helpful?: boolean;            // Whether response was helpful (from feedback)
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
  conversation_id?: string;
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

