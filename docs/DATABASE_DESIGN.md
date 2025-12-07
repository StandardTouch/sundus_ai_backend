# Database Design - What We Actually Need

## Do We Need to Store Conversations?

### ❌ What We DON'T Need to Store

1. **Full Conversation History**
   - ❌ We can pass message history to OpenAI each time
   - ❌ OpenAI doesn't require us to store it
   - ❌ Can be stateless (pass history in each API call)

2. **Individual Messages**
   - ❌ Not needed for our use case
   - ❌ AI Sensy webhook gives us the message
   - ❌ We just process and respond

### ✅ What We DO Need to Store

1. **User State/Session** (Critical!)
   - ✅ **Authentication token** - After OTP verification, we get a token
   - ✅ **User ID** - From OTP verification
   - ✅ **Negative feedback count** - For escalation (track "No" clicks)
   - ✅ **Language preference** - User's preferred language (EN/AR)
   - ✅ **Status** - active/escalated/closed (for escalation)

2. **Feedback Records** (For Analytics)
   - ✅ Message ID
   - ✅ Feedback (yes/no)
   - ✅ Timestamp
   - ✅ Link to user (phone_number)

3. **FAQ Metadata** (For FAQ System)
   - ✅ Questions/Answers
   - ✅ Vector DB IDs
   - ✅ Categories

## Simplified Database Design (MongoDB)

### Collection 1: `user_sessions` (Not "conversations")

```typescript
{
  _id: ObjectId,
  phone_number: string,           // Primary identifier
  contact_id?: string,            // From AI Sensy webhook
  language: 'en' | 'ar' | 'auto', // User's language preference
  status: 'active' | 'escalated' | 'closed',
  negative_feedback_count: number, // For escalation (track "No" clicks)
  positive_feedback_count: number, // For analytics (track "Yes" clicks)
  // Authentication (after OTP)
  token?: string,                 // From OTP verification
  user_id?: string,                // From OTP verification
  token_expires_at?: Date,        // Token expiration
  // Timestamps
  created_at: Date,
  updated_at: Date
}
```

**Why "user_sessions" not "conversations"?**
- It's really user state, not full conversation history
- Simpler and more accurate name
- Focuses on what we actually need

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

### Collection 3: `faqs`

```typescript
{
  _id: ObjectId,
  question: string,               // FAQ question (EN)
  answer: string,                 // FAQ answer (EN)
  answer_ar?: string,             // FAQ answer (AR) - optional
  category?: string,              // FAQ category
  vector_id: string,              // Pinecone vector ID (for semantic search)
  
  // FAQ Source & Status
  source: 'manual' | 'ai_suggested',  // How FAQ was created
  status: 'active' | 'pending_review' | 'rejected',  // Review status
  
  // AI Suggestion Details (if source is 'ai_suggested')
  ai_suggestion?: {
    source_conversation_id?: string,  // Conversation that triggered suggestion
    source_message_id?: string,       // Message that triggered suggestion
    confidence_score?: number,        // AI confidence (0-1)
    suggested_at: Date,              // When AI suggested it
    reviewed_by?: string,             // Admin who reviewed
    reviewed_at?: Date,               // When reviewed
    review_notes?: string,            // Admin notes
  },
  
  // Usage Statistics
  usage_count: number,             // How many times this FAQ was used
  last_used_at?: Date,            // Last time FAQ was returned
  
  is_active: boolean,             // Active/inactive FAQ
  created_at: Date,
  updated_at: Date
}
```

**Important:** 
- **MongoDB stores:** FAQ metadata (question, answer, category, source, status)
- **Pinecone stores:** Vector embeddings (for semantic search)
- **vector_id** links MongoDB FAQ to Pinecone embedding
- **source**: Distinguishes manual FAQs from AI-suggested ones
- **status**: Allows admin to review AI suggestions before activating

## Do We Need Conversations?

### Option 1: Minimal (Recommended) ✅

**Store:** User state only (token, feedback count, language)
**Don't Store:** Full conversation history

**Pros:**
- Simpler
- Less storage
- Stateless design
- Pass history to OpenAI each time

**Cons:**
- Need to build history from webhook each time (but that's fine)

### Option 2: Full Conversations

**Store:** Every message, full history

**Pros:**
- Can query past conversations
- Analytics on conversations
- Resume conversations after breaks

**Cons:**
- More complex
- More storage
- Probably overkill for our use case

## Recommendation: Minimal Approach ✅

**Store:**
- ✅ User sessions (token, feedback counts, language, status)
- ✅ Feedback records
- ✅ FAQ metadata (MongoDB) + FAQ embeddings (Pinecone)

**Don't Store:**
- ❌ Full conversation history
- ❌ Individual messages
- ❌ OTPs (WordPress handles this)

**How it works:**
1. Webhook comes in with message
2. Load user session (get token, feedback count, language)
3. Build message history from webhook context (if needed)
4. Call OpenAI with current message + context
5. Update user session if needed (token, feedback count)
6. Store feedback if user provided it

## MongoDB Schema (Simplified)

```typescript
// user_sessions collection
interface UserSession {
  _id: ObjectId;
  phone_number: string;
  contact_id?: string;
  language: 'en' | 'ar' | 'auto';
  status: 'active' | 'escalated' | 'closed';
  negative_feedback_count: number;  // Track "No" clicks (for escalation)
  positive_feedback_count: number;  // Track "Yes" clicks (for analytics)
  token?: string;              // From OTP verification
  user_id?: string;            // From OTP verification
  token_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// feedback collection
interface Feedback {
  _id: ObjectId;
  phone_number: string;
  message_id: string;
  feedback: 'yes' | 'no';
  created_at: Date;
}

// faqs collection
interface FAQ {
  _id: ObjectId;
  question: string;
  answer: string;
  answer_ar?: string;
  category?: string;
  vector_id: string;
  
  // Source & Status
  source: 'manual' | 'ai_suggested';
  status: 'active' | 'pending_review' | 'rejected';
  
  // AI Suggestion Details (if source is 'ai_suggested')
  ai_suggestion?: {
    source_conversation_id?: string;
    source_message_id?: string;
    confidence_score?: number;
    suggested_at: Date;
    reviewed_by?: string;
    reviewed_at?: Date;
    review_notes?: string;
  };
  
  // Usage Statistics
  usage_count: number;
  last_used_at?: Date;
  
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

## Indexes Needed

```typescript
// user_sessions
db.user_sessions.createIndex({ phone_number: 1 }, { unique: true });
db.user_sessions.createIndex({ contact_id: 1 });

// feedback
db.feedback.createIndex({ phone_number: 1 });
db.feedback.createIndex({ created_at: -1 });

// faqs
db.faqs.createIndex({ is_active: 1 });
db.faqs.createIndex({ status: 1 });  // For filtering pending reviews
db.faqs.createIndex({ source: 1 });  // For filtering manual vs AI-suggested
db.faqs.createIndex({ category: 1 });
db.faqs.createIndex({ vector_id: 1 });  // For linking to Pinecone
db.faqs.createIndex({ 'ai_suggestion.suggested_at': -1 });  // For reviewing new suggestions
db.faqs.createIndex({ usage_count: -1 });  // For finding popular FAQs
```

## FAQ Storage: MongoDB + Pinecone

### MongoDB Stores:
- ✅ FAQ metadata (question, answer EN/AR, category)
- ✅ FAQ source (manual vs AI-suggested)
- ✅ FAQ status (active, pending_review, rejected)
- ✅ AI suggestion details (conversation, confidence, review info)
- ✅ Usage statistics (usage_count, last_used_at)
- ✅ Vector ID (link to Pinecone)

### Pinecone Stores:
- ✅ Vector embeddings (for semantic search)
- ✅ Linked by same ID as MongoDB `_id`

### FAQ Types:

**1. Manual FAQs (Base FAQs)**
- Added by admin
- `source: "manual"`
- `status: "active"` (immediately)
- Embedding generated and stored in Pinecone

**2. AI-Suggested FAQs**
- Generated from conversations
- `source: "ai_suggested"`
- `status: "pending_review"` (initially)
- Admin reviews and approves/rejects
- If approved: Embedding generated → Stored in Pinecone → `status: "active"`

**See:** 
- [FAQ Storage Explanation](./FAQ_STORAGE_EXPLANATION.md) for storage details
- [AI FAQ Suggestions](./AI_FAQ_SUGGESTIONS.md) for AI suggestion system

