/**
 * FAQ Model
 * MongoDB schema for FAQs (both manual and AI-suggested)
 */

export interface FAQ {
  _id?: string;
  
  // Content
  question: string;                // FAQ question (English)
  question_ar?: string;           // FAQ question (Arabic) - optional
  answer: string;                 // FAQ answer (English)
  answer_ar?: string;             // FAQ answer (Arabic) - optional
  category?: string;              // FAQ category - MUST ALWAYS BE IN ENGLISH (e.g., "policies", "shipping", "payment", "orders")
  
  // Vector Search
  vector_id: string;  // Pinecone vector ID
  
  // Source & Status
  source: 'manual' | 'ai_suggested';
  status: 'active' | 'pending_review' | 'rejected';
  
  // AI Suggestion Details (only if source is 'ai_suggested')
  ai_suggestion?: {
    source_conversation_id?: string;  // Conversation that triggered suggestion
    source_message_id?: string;       // Message that triggered suggestion
    confidence_score?: number;        // AI confidence (0-1)
    suggested_at: Date;
    reviewed_by?: string;             // Admin username who reviewed
    reviewed_at?: Date;
    review_notes?: string;            // Admin review comments
  };
  
  // Usage Statistics
  usage_count: number;                // How many times this FAQ was returned
  last_used_at?: Date;
  
  // Metadata
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create FAQ DTO (for manual FAQs)
 * 
 * IMPORTANT: category MUST ALWAYS BE IN ENGLISH (e.g., "policies", "shipping", "payment")
 */
export interface CreateFAQDto {
  question: string;
  question_ar?: string;
  answer: string;
  answer_ar?: string;
  category?: string;  // MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment", "orders"
}

/**
 * AI Suggested FAQ DTO
 * 
 * IMPORTANT: category MUST ALWAYS BE IN ENGLISH (e.g., "policies", "shipping", "payment")
 */
export interface AISuggestedFAQDto {
  question: string;
  question_ar?: string;
  answer: string;
  answer_ar?: string;
  category?: string;  // MUST BE IN ENGLISH - e.g., "policies", "shipping", "payment", "orders"
  source_conversation_id?: string;
  source_message_id?: string;
  confidence_score: number;
}

/**
 * Review FAQ DTO (for admin)
 */
export interface ReviewFAQDto {
  action: 'approve' | 'reject';
  review_notes?: string;
  edited_question?: string;  // Admin can edit before approving
  edited_question_ar?: string;  // Admin can edit Arabic question before approving
  edited_answer?: string;
  edited_answer_ar?: string;
}

