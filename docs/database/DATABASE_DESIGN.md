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

### Collection 2: `conversation_messages`

```typescript
{
  _id: ObjectId,
  phone_number: string,           // Link to user
  message_id: string,             // AI Sensy message ID
  role: 'user' | 'assistant',     // Message role
  content: string,                 // Message text content
  replied_to_message_id?: string,  // If reply, original message ID
  timestamp: Date,                 // Message timestamp
  metadata?: {
    tool_calls?: any[],            // Tool calls made (if assistant)
    feedback?: 'yes' | 'no',       // User feedback (if user)
  }
}
```

**Indexes:**
- `{ phone_number: 1, timestamp: -1 }` - For loading recent messages
- `{ message_id: 1 }` - For finding specific messages
- TTL index on `timestamp` (optional, auto-delete after 90 days)

**Storage Strategy:**
- Store last 20 messages per user
- Auto-cleanup older messages
- Used for context and AI FAQ suggestions

### Collection 3: `feedback`

```typescript
{
  _id: ObjectId,
  phone_number: string,           // Link to user
  message_id: string,             // AI Sensy message ID
  feedback: 'yes' | 'no',
  created_at: Date
}
```

### Collection 4: `faqs`

**Purpose:** Store FAQ metadata (questions, answers, categories, status, AI suggestions)

**Key Features:**
- Supports bilingual content (English and Arabic)
- Categories MUST ALWAYS be in English
- Links to Pinecone via `vector_id` for semantic search
- Tracks AI-suggested FAQs with review workflow

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
- **MongoDB stores:** FAQ metadata (question, answer EN/AR, category, source, status)
- **Pinecone stores:** Vector embeddings (for semantic search)
- **vector_id** links MongoDB FAQ to Pinecone embedding
- **source**: Distinguishes manual FAQs from AI-suggested ones
- **status**: Allows admin to review AI suggestions before activating
- **category**: MUST ALWAYS be in English, regardless of FAQ language

## Conversation Storage Decision: Hybrid Approach ✅

**Decision:** Store last 20 messages per user with auto-cleanup

**Why This Approach:**
- ✅ **Context is critical** - Better conversation continuity
- ✅ **AI FAQ Suggestions** - Need conversation data to suggest FAQs
- ✅ **Reply Handling** - Cache original messages for faster access
- ✅ **Analytics** - Track common questions and patterns
- ✅ **Debugging** - Easier to debug issues with stored messages
- ✅ **Balanced** - Not too much storage, not too little context

## Recommendation: Hybrid Approach ✅ (Updated)

**Store:**
- ✅ User sessions (token, feedback counts, language, status)
- ✅ Feedback records
- ✅ FAQ metadata (MongoDB) + FAQ embeddings (Pinecone)
- ✅ **Recent messages (last 20 per user)** - For context and AI FAQ suggestions

**Don't Store:**
- ❌ Full conversation history (everything)
- ❌ Very old messages (auto-cleanup after 90 days)
- ❌ OTPs (WordPress handles this)

**Why Store Recent Messages?**
1. **AI FAQ Suggestions** - Need conversation data to suggest FAQs
2. **Better Context** - OpenAI gets better context for replies
3. **Analytics** - Track common questions and patterns
4. **Reply Handling** - Cache original messages for faster access
5. **Debugging** - Easier to debug issues with stored messages

**How it works:**
1. Webhook comes in with message
2. Load user session (get token, feedback count, language)
3. Load recent messages from database (last 20)
4. Build optimized conversation history:

   **If Reply (has replied_to_message_id):**
     - Find replied-to message in stored history (by `message_id`)
     - Include context window around replied-to message (±3-5 messages)
     - Result: ~7-11 contextually relevant messages
   
   **If New Message (no reply):**
     - Include last 8 messages from database
     - Result: ~9 messages (recent context)

5. Call OpenAI with optimized context (not all 20 messages)
6. Store current message in database
7. Update user session if needed (token, feedback count)
8. Store feedback if user provided it
9. Auto-cleanup old messages (keep last 20)

**Token Optimization:**
- ✅ **Reply-based context:** 60-70% token reduction vs full history
- ✅ **New message context:** 55% token reduction vs full history
- ✅ **Cost effective:** Lower OpenAI API costs
- ✅ **Contextually relevant:** Includes conversation thread

**See:** [Conversation Storage Analysis](./CONVERSATION_STORAGE_ANALYSIS.md) for detailed comparison and rationale.

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

// conversation_messages collection
interface ConversationMessage {
  _id: ObjectId;
  phone_number: string;
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  replied_to_message_id?: string;
  timestamp: Date;
  metadata?: {
    tool_calls?: any[];
    feedback?: 'yes' | 'no';
  };
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
  question_ar?: string;           // FAQ question (Arabic) - optional
  answer: string;
  answer_ar?: string;
  category?: string;               // MUST ALWAYS BE IN ENGLISH
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

// tool_settings collection
interface ToolSettings {
  _id: ObjectId;
  tool_name: string;               // Unique tool name (e.g., "search_products", "track_order")
  category: string;                // Tool category: "products" | "orders" | "faqs" | "general"
  display_name: string;            // Human-readable name (e.g., "Search Products")
  description: string;             // Tool description for admin panel
  is_enabled: boolean;             // Whether tool is enabled (default: true)
  updated_by?: string;             // User ID who last updated this setting
  created_at: Date;
  updated_at: Date;
}

// support_settings collection
interface SupportSettings {
  _id: ObjectId;
  key: string;                     // Setting key (e.g., "support_phone_number")
  value: string;                   // Setting value (string)
  description?: string;            // Human-readable description
  updated_by?: string;             // User ID who last updated this setting
  created_at: Date;
  updated_at: Date;
}
```

## Indexes Needed

```typescript
// user_sessions
db.user_sessions.createIndex({ phone_number: 1 }, { unique: true });
db.user_sessions.createIndex({ contact_id: 1 });

// conversation_messages
db.conversation_messages.createIndex({ phone_number: 1, timestamp: -1 });  // For loading recent messages
db.conversation_messages.createIndex({ message_id: 1 });  // For finding specific messages
db.conversation_messages.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });  // Auto-delete after 90 days (optional)

// feedback
db.feedback.createIndex({ phone_number: 1 });
db.feedback.createIndex({ created_at: -1 });

// faqs
db.faqs.createIndex({ is_active: 1 });
db.faqs.createIndex({ status: 1 });  // For filtering pending reviews
db.faqs.createIndex({ source: 1 });  // For filtering manual vs AI-suggested
db.faqs.createIndex({ category: 1 });
db.faqs.createIndex({ vector_id: 1 });  // For linking to Pinecone
db.faqs.createIndex({ is_active: 1, status: 1 });  // Compound index for active FAQs
db.faqs.createIndex({ usage_count: -1 });  // For finding popular FAQs

// tool_settings
db.tool_settings.createIndex({ tool_name: 1 }, { unique: true });  // Unique tool name
db.tool_settings.createIndex({ category: 1 });  // For filtering by category
db.tool_settings.createIndex({ is_enabled: 1 });  // For filtering enabled/disabled tools

// support_settings
db.support_settings.createIndex({ key: 1 }, { unique: true });  // Unique setting key
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
- [AI FAQ Suggestions](../features/AI_FAQ_SUGGESTIONS.md) for AI suggestion system

### Collection 5: `tool_settings`

**Purpose:** Store enable/disable settings for AI agent tools

```typescript
{
  _id: ObjectId,
  tool_name: string,              // Unique tool name (e.g., "search_products", "track_order")
  category: string,               // Tool category: "products" | "orders" | "faqs" | "general"
  display_name: string,           // Human-readable name (e.g., "Search Products")
  description: string,            // Tool description for admin panel
  is_enabled: boolean,            // Whether tool is enabled (default: true)
  updated_by?: string,            // User ID who last updated this setting
  created_at: Date,
  updated_at: Date
}
```

**Key Features:**
- Admins can enable/disable individual tools from admin panel
- Tools are automatically added to DB when first accessed (default: enabled)
- Caching layer (1-minute TTL) for performance
- Categories: products, orders, faqs, general

**Available Tools:**
- **Products (3):** `search_products`, `get_product_details`, `list_brands`
- **Orders (2):** `track_order`, `get_order_details`
- **FAQs (1):** `search_faqs`

**Indexes:**
- `tool_name: 1` (unique) - Fast lookup by tool name
- `category: 1` - Filter by category
- `is_enabled: 1` - Filter enabled/disabled tools

**Usage:**
- System fetches enabled tools from DB before calling OpenAI
- Disabled tools are not sent to OpenAI (AI can't use them)
- Changes take effect immediately (cache invalidated on update)

### Collection 6: `support_settings`

**Purpose:** Store support-related settings (string values)

```typescript
{
  _id: ObjectId,
  key: string,                    // Setting key (e.g., "support_phone_number")
  value: string,                  // Setting value (string)
  description?: string,           // Human-readable description
  updated_by?: string,            // User ID who last updated this setting
  created_at: Date,
  updated_at: Date
}
```

**Key Features:**
- Stores string-based settings (different from boolean `settings` collection)
- Currently used for: `support_phone_number`
- Phone number sent to users when they select "Talk to Human" in feedback

**Indexes:**
- `key: 1` (unique) - Fast lookup by setting key

**See:** 
- [FAQ Storage Explanation](./FAQ_STORAGE_EXPLANATION.md) for storage details
- [AI FAQ Suggestions](../features/AI_FAQ_SUGGESTIONS.md) for AI suggestion system

