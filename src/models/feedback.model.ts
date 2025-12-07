/**
 * Feedback Model
 * MongoDB schema for user feedback
 */

export interface Feedback {
  _id?: string;
  
  phone_number: string;           // Link to user
  message_id: string;             // AI Sensy message ID
  feedback: 'yes' | 'no';
  
  created_at: Date;
}

/**
 * Create Feedback DTO
 */
export interface CreateFeedbackDto {
  phone_number: string;
  message_id: string;
  feedback: 'yes' | 'no';
}

