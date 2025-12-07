# Sundus AI - System Architecture

## High-Level Architecture (Agentic Approach)

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Users                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Sensy Platform                         │
│  • WhatsApp Business API                                    │
│  • Message Routing                                          │
│  • Agent Dashboard                                          │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
                │ Webhooks (Incoming)   │ API Calls (Outgoing)
                │                       │
                ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Sundus AI Backend Server                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Webhook Handler Layer                     │   │
│  │  • Parse incoming webhooks                           │   │
│  │  • Validate payload                                  │   │
│  │  • Extract message data                              │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │            Message Handler                            │   │
│  │  • Load conversation context                          │   │
│  │  • Prepare message history                            │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │            AI Agent (OpenAI)                        │   │
│  │  • Function Calling / Tool Use                       │   │
│  │  • Decides: Call tool or respond directly           │   │
│  │  • Available Tools:                                   │   │
│  │    - search_products                                 │   │
│  │    - get_product_details                             │   │
│  │    - track_order                                     │   │
│  │    - search_faqs                                     │   │
│  │    - list_brands                                     │   │
│  └───────┬───────────┬───────────┬───────────┬──────────┘   │
│          │           │           │           │                │
│    ┌─────▼──┐  ┌─────▼──┐  ┌─────▼──┐  ┌─────▼──┐          │
│    │Product │  │ Order  │  │  FAQ   │  │ Brand  │          │
│    │Executor│  │Executor│  │Executor│  │Executor│          │
│    └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘          │
│         │           │           │           │                │
│  ┌──────▼───────────▼───────────▼───────────▼──────────┐   │
│  │              Services Layer                           │   │
│  │  • Product Service                                   │   │
│  │  • Order Service                                     │   │
│  │  • FAQ Service                                       │   │
│  │  • Brand Service                                     │   │
│  └──────┬──────────┬──────────┬──────────┬──────────────┘   │
│         │          │          │          │                   │
│  ┌──────▼──────────▼──────────▼──────────▼──────────────┐   │
│  │              API Clients                             │   │
│  │  • Alhomaidhi API Client                             │   │
│  │  • AI Sensy API Client                               │   │
│  │  • Vector DB Client                                  │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │         Response Generator                          │   │
│  │  • Format AI response                                │   │
│  │  • Add feedback prompt                               │   │
│  │  • Language formatting                                │   │
│  └───────────────────┬──────────────────────────────────┘   │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   OpenAI     │  │   Vector DB  │  │ Alhomaidhi   │     │
│  │   (GPT-4)    │  │  (Pinecone)  │  │     API      │     │
│  │ Function     │  │              │  │              │     │
│  │ Calling      │  └──────────────┘  └──────────────┘     │
│  └──────────────┘  ┌──────────────┐                       │
│                    │   Database   │                       │
│                    │   (MongoDB)  │                       │
│                    └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### Agentic Design
- **AI-Driven Decisions:** OpenAI decides when to call tools based on user intent
- **Function Calling:** Uses OpenAI's function calling/tool use feature
- **Natural Conversations:** No need for explicit commands - AI understands context
- **Intelligent Routing:** AI determines the best action for each message

### Modular Structure
- **One File Per Operation:** Each tool/feature in its own file
- **Separation of Concerns:** Clear layers (Handler → Agent → Executor → Service → API)
- **Scalable:** Easy to add new tools without modifying existing code
- **Testable:** Each module can be tested in isolation

## Component Details

### 1. Webhook Handler Layer

**Responsibilities:**
- Receive webhooks from AI Sensy
- Validate webhook payload
- Extract message data
- Route to appropriate handler

**Input:** AI Sensy webhook payload
**Output:** Parsed message object

### 2. Message Handler

**Responsibilities:**
- Load conversation context from database (last 20 messages)
- Handle message replies (fetch original message context)
- Build complete conversation history
- Prepare message history for AI
- Call AI agent with conversation context
- Handle agent's tool calls
- Format and send responses
- Store messages in database (with auto-cleanup)

**Process:**
- Extract message from webhook
- Load user session (token, feedback count, language)
- Load recent messages from database (last 20 per user)
- Check if message is a reply (`replied_to_message_id`)
- If reply: Fetch original message using `getMessageDetails()` and add to conversation history
- Build conversation history:
  * Recent messages from database (last 20)
  * Original message (if reply)
  * Current user message
- Pass to AI agent with full context
- Process agent response (direct or tool call)
- Store current message in database
- Auto-cleanup old messages (keep last 20)
- Send response via AI Sensy

**Context Management:**
- **Stored:** Last 20 messages per user in `conversation_messages` collection
- **Auto-cleanup:** Older messages automatically removed (keep last 20)
- **Purpose:** Better context for OpenAI, AI FAQ suggestions, analytics, debugging
- **Privacy:** Limited storage, auto-cleanup, no long-term retention

**Reply Handling:**
When a user replies to a message, we automatically fetch the original message context in the backend (not via AI tool) and include it in the conversation history. This ensures OpenAI has full context without needing an extra tool call.

**See:** 
- [Message Reply Handling](../development/MESSAGE_REPLY_HANDLING.md) for implementation details
- [Conversation Storage Analysis](../database/CONVERSATION_STORAGE_ANALYSIS.md) for storage rationale

### 3. AI Agent

**Responsibilities:**
- Manage conversation with OpenAI
- Provide tools/functions to AI
- Handle AI's tool call decisions
- Execute tools when AI requests
- Format tool results for AI
- Generate final response

**Available Tools:**
- `search_products(query)` - Search products by SKU/brand/text
- `get_product_details(product_id)` - Get full product info
- `list_brands()` - Get all available brands
- `track_order(order_id, phone_number)` - Start order tracking
- `verify_otp(phone_number, otp_code)` - Verify OTP
- `get_order_details(order_id, token)` - Get order after auth
- `search_faqs(query)` - Search FAQ database

**Agent Flow:**
1. Receive message and conversation history
2. Call OpenAI with tools available
3. AI decides: call tool or respond directly
4. If tool called: execute tool → return result to AI
5. AI formats final response with tool results
6. Return formatted response

### 4. Tool Executors

**Purpose:** Execute tools when AI calls them

#### Product Executor
- Executes `search_products` and `get_product_details`
- Calls product service
- Returns product data to AI

#### Order Executor
- Executes `track_order`, `verify_otp`, `get_order_details`
- Handles OTP flow
- Calls order service
- Returns order data to AI

#### FAQ Executor
- Executes `search_faqs`
- Calls FAQ service (vector search)
- Returns FAQ answer to AI

#### Brand Executor
- Executes `list_brands`
- Calls brand service
- Returns brand list to AI

### 5. Services Layer

**Purpose:** Business logic and orchestration

#### Product Service
- Product search logic
- Product formatting
- Calls product API client

#### Order Service
- Order tracking logic
- OTP management
- Authentication flow
- Calls order API client

#### FAQ Service
- FAQ search logic
- Vector database operations
- Similarity matching
- Calls vector DB client

#### Conversation Service
- Conversation state management
- Context tracking
- History management
- Language detection

### 6. Response Generator

**Responsibilities:**
- Format AI response message
- Add feedback prompt ("Was this helpful?")
- Handle language formatting (EN/AR)
- Generate quick reply buttons
- Send via AI Sensy API

## Data Flow

### Standard Message Flow (Agentic)

```
1. User sends message via WhatsApp
   ↓
2. AI Sensy receives message
   ↓
3. AI Sensy sends webhook to Sundus AI
   ↓
4. Webhook Handler parses payload
   ↓
5. Message Handler loads conversation context
   ↓
6. AI Agent receives message + history
   ↓
7. AI decides: Call tool or respond directly?
   ↓
8a. If tool called:
    - Tool Executor routes to appropriate executor
    - Executor calls Service
    - Service calls API Client
    - API Client makes HTTP request
    - Result flows back: API → Service → Executor → Agent → AI
    ↓
8b. If direct response:
    - AI generates response
    ↓
9. AI formats final response (with tool results if any)
   ↓
10. Response Generator adds feedback prompt
   ↓
11. Send response via AI Sensy API
   ↓
12. User receives message on WhatsApp
```

### Order Tracking Flow (Agentic)

```
1. User: "Track order #6317"
   ↓
2. AI Agent receives message
   ↓
3. AI decides to call: track_order(order_id="6317", phone_number="...")
   ↓
4. Order Executor receives tool call
   ↓
5. Check if user authenticated (has token):
   - If yes: Skip to step 8
   - If no: Proceed to OTP flow
   ↓
6. OTP Flow:
   a. Order Service calls: sendOTP(phone_number)
   b. API Client calls Alhomaidhi: POST /number_verification
   c. OTP sent via SMS/email by API
   d. Send OTP to user via WhatsApp: "Your OTP is: 123456"
   e. Wait for user: "123456"
   f. Order Service calls: verifyOTP(phone_number, otp_code)
   g. API Client calls Alhomaidhi: POST /otp_verification
   h. Receive token and user_id
   i. Store token in conversation
   ↓
7. Order Service calls: getOrderDetails(order_id, token)
   ↓
8. API Client calls Alhomaidhi: GET /retrieve_order?order_id=6317
   ↓
9. Order data returned to Order Executor
   ↓
10. Executor returns order data to AI Agent
   ↓
11. AI formats response: "Your order #6317 status: Completed..."
   ↓
12. Send formatted response to user
```

### FAQ Search Flow (Agentic)

```
1. User: "What is your return policy?"
   ↓
2. AI Agent receives message
   ↓
3. AI decides to call: search_faqs(query="return policy")
   ↓
4. FAQ Executor receives tool call
   ↓
5. FAQ Service generates query embedding (OpenAI)
   ↓
6. FAQ Service searches vector database:
   - Query: Find similar embeddings
   - Return top 3 matches with similarity scores
   ↓
7. FAQ Service checks similarity:
   - If top match > 0.85: Return FAQ answer
   - Else: Return null (let AI generate response)
   ↓
8. FAQ Executor returns result to AI Agent
   ↓
9a. If FAQ found:
    - AI formats: "According to our return policy: [FAQ answer]"
9b. If no FAQ found:
    - AI generates general response using knowledge
   ↓
10. Send formatted response to user
```

### Product Search Flow (Agentic)

```
1. User: "Show me Nike watches" or "Search SKU MTTS2F504"
   ↓
2. AI Agent receives message
   ↓
3. AI decides to call: search_products(query="Nike watches")
   ↓
4. Product Executor receives tool call
   ↓
5. Product Service calls: searchProductsAPI(query)
   ↓
6. API Client calls Alhomaidhi: GET /list_products?search={query}
   ↓
7. Product results returned to Product Executor
   ↓
8. If single result:
   - AI calls: get_product_details(product_id)
   - Get full product details
   - Format with image, price, link
9. If multiple results:
   - Format list of top 5 products
   - Include images and links
   ↓
10. AI formats response: "I found [X] products. Here are the top results..."
   ↓
11. Send formatted response with product images to user
```

### Escalation Flow

```
1. User clicks "No" on feedback
   ↓
2. Feedback Handler processes
   ↓
3. Update conversation:
   - Increment negative_feedback_count
   - Store feedback record
   ↓
4. Check threshold:
   - If count >= 3: Trigger escalation
   ↓
5. Escalation Process:
   - Set conversation.status = "ESCALATED"
   - Call AI Sensy agent handover API
   - Send notification to user
   - Transfer conversation context
   ↓
6. Human agent takes over via AI Sensy dashboard
```

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  contact_id VARCHAR(50),
  language VARCHAR(5) DEFAULT 'auto',
  status VARCHAR(20) DEFAULT 'active',
  negative_feedback_count INT DEFAULT 0,
  last_feedback VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Feedback Table
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  message_id VARCHAR(100),
  feedback VARCHAR(5) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### OTP Table
```sql
CREATE TABLE otps (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  order_number VARCHAR(50),
  otp_code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### FAQ Metadata Table
```sql
CREATE TABLE faqs_metadata (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_ar TEXT,
  category VARCHAR(50),
  vector_id VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Integration Points

### AI Sensy API
- **Webhook Endpoint:** `POST /webhook` (receives)
- **Send Message:** `POST https://backend.aisensy.com/campaign/v1/send` (sends)
- **Agent Handover:** (To be verified)

### OpenAI API
- **Chat Completion:** `POST https://api.openai.com/v1/chat/completions`
- **Embeddings:** `POST https://api.openai.com/v1/embeddings`

### Vector Database (Pinecone)
- **Query:** `POST /query`
- **Upsert:** `POST /vectors/upsert`

### Order System API
- **Order Lookup:** `GET /orders/{orderNumber}` (To be determined)

### Product Catalog API
- **Search:** `GET /products/search?q={query}` (To be determined)

## Security Architecture & Guardrails

```
┌─────────────────────────────────────┐
│         Guardrails Layers           │
├─────────────────────────────────────┤
│ 1. Input Guardrails                 │
│    • Input validation & sanitization│
│    • Content moderation (OpenAI)    │
│    • Prompt injection prevention    │
│    • Phone number validation        │
├─────────────────────────────────────┤
│ 2. Processing Guardrails             │
│    • Token/context management       │
│    • Rate limiting (per user)        │
│    • Tool call validation           │
│    • Authorization checks           │
├─────────────────────────────────────┤
│ 3. Output Guardrails                │
│    • Output content filtering       │
│    • PII protection                 │
│    • Response format validation     │
│    • Safety checks                  │
├─────────────────────────────────────┤
│ 4. API Security                     │
│    • API key management             │
│    • Secret management service      │
│    • HTTPS for all communications   │
│    • API rate limiting              │
├─────────────────────────────────────┤
│ 5. Authentication & Authorization   │
│    • OTP-based auth for orders      │
│    • Token validation               │
│    • User verification              │
│    • Session management             │
├─────────────────────────────────────┤
│ 6. Data Protection                  │
│    • Data encryption (at rest)      │
│    • Data encryption (in transit)   │
│    • Secure OTP storage             │
│    • GDPR compliance                │
└─────────────────────────────────────┘
```

**See:** [Guardrails Documentation](../development/GUARDRAILS.md) for complete guardrails implementation

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Load balancer for multiple instances
- Database connection pooling

### Caching Strategy
- MongoDB for user sessions and state
- Pinecone for fast FAQ semantic search
- In-memory caching for frequently accessed data (optional, can add Redis later if needed)

### Database Optimization
- Index on phone_number, contact_id
- Index on conversation_id for feedback
- Vector database for fast FAQ search

### Rate Limiting
- Per-user message rate limits
- OpenAI API rate limits
- OTP generation limits

## Monitoring & Logging

### Metrics to Track
- Message processing time
- OpenAI API latency
- Vector search latency
- Error rates
- Escalation rate
- Feedback distribution

### Logging
- All incoming webhooks
- All outgoing messages
- API call logs
- Error logs with stack traces
- User action logs

### Alerts
- High error rate
- API failures
- Escalation spike
- System downtime

