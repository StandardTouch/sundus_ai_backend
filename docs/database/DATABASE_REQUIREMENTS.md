# Database Requirements

## What We Need to Store

### ✅ Required: MongoDB

**1. User Sessions**
- Phone number, contact ID
- Language preference (en/ar)
- Status (active/escalated/closed)
- Negative feedback count
- Positive feedback count
- Authentication token (after OTP verification)
- User ID (after OTP verification)
- Created/updated timestamps

**2. Conversation Messages (Last 20 per user)**
- Phone number
- Message ID
- Role (user/assistant)
- Content (message text)
- Replied to message ID (if reply)
- Timestamp
- Metadata (tool calls, feedback)

**Storage Strategy:**
- Store last 20 messages per user
- Auto-cleanup older messages
- Used for context, AI FAQ suggestions, analytics

**3. Feedback**
- Phone number
- Message ID
- Feedback (yes/no)
- Timestamp

**4. FAQ Metadata**
- Question (EN/AR)
- Answer (EN/AR)
- Category
- Vector DB ID (for Pinecone)
- Source (manual/ai_suggested)
- Status (active/pending_review/rejected)
- AI suggestion details
- Usage statistics
- Timestamps

### ❌ NOT Needed

**1. OTP Storage**
- ❌ WordPress handles OTP delivery and verification
- ❌ We just call the API, don't store OTPs
- ❌ No OTP table needed

## Database Schema (MongoDB)

### Collection 1: `user_sessions`

```typescript
{
  _id: ObjectId,
  phone_number: string,           // Primary identifier (unique)
  contact_id?: string,            // From AI Sensy webhook
  language: 'en' | 'ar' | 'auto', // User's language preference
  status: 'active' | 'escalated' | 'closed',
  negative_feedback_count: number, // For escalation (track "No" clicks)
  positive_feedback_count: number, // For analytics (track "Yes" clicks)
  token?: string,                 // From OTP verification
  user_id?: string,                // From OTP verification
  token_expires_at?: Date,        // Token expiration
  created_at: Date,
  updated_at: Date
}
```

### Collection 2: `feedback`

```typescript
{
  _id: ObjectId,
  phone_number: string,           // Link to user
  message_id: string,             // AI Sensy message ID
  feedback: 'yes' | 'no',
  created_at: Date
}
```

### FAQ Collection (MongoDB)
```typescript
{
  _id: ObjectId,
  question: string,
  answer: string,
  answer_ar?: string,
  category?: string,
  vector_id: string,
  
  // Source & Status
  source: 'manual' | 'ai_suggested',
  status: 'active' | 'pending_review' | 'rejected',
  
  // AI Suggestion Details
  ai_suggestion?: {
    source_conversation_id?: string,
    source_message_id?: string,
    confidence_score?: number,
    suggested_at: Date,
    reviewed_by?: string,
    reviewed_at?: Date,
    review_notes?: string,
  },
  
  // Usage Statistics
  usage_count: number,
  last_used_at?: Date,
  
  is_active: boolean,
  created_at: Date,
  updated_at: Date
}
```

**Note:** 
- Manual FAQs: Added by admin, immediately active
- AI-Suggested FAQs: Generated from conversations, pending admin review
- System continuously improves by learning from conversations

## Environment Variables

### Required
```env
MONGODB_URI=mongodb://localhost:27017/sundus_ai
```

### Vector Database (Pinecone)
```env
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=sundus-faqs
```

