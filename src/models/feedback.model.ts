/**
 * Feedback Model
 * MongoDB schema for user feedback
 * Optimized for analytics: track happy users vs escalation requests
 */

export interface Feedback {
  _id?: string;
  
  // User identification
  phone_number: string;           // Link to user
  
  // Conversation tracking
  conversation_id?: string;       // Link to conversation thread
  
  // Message identification
  message_id: string;             // AI Sensy message ID (quick reply message)
  original_message_id?: string;   // AI Sensy message ID of the AI response being rated
  
  // Feedback data
  feedback: 'yes' | 'no';         // Original feedback value
  response_type: 'positive' | 'escalation';  // Clearer for analytics: positive = happy, escalation = wanted human
  is_positive: boolean;            // Boolean for easy filtering (true = happy, false = wanted human)
  
  // Template/language info
  template_name?: string;          // Template used: "message_feedback_english" or "message_feedback_arabic"
  language?: 'en' | 'ar';         // Language of the template
  
  // Timestamp
  created_at: Date;
}

/**
 * Create Feedback DTO
 */
export interface CreateFeedbackDto {
  phone_number: string;
  message_id: string;
  feedback: 'yes' | 'no';
  conversation_id?: string;
  original_message_id?: string;
  template_name?: string;
  language?: 'en' | 'ar';
}

