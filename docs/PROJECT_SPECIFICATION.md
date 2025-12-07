# Sundus AI Chatbot - Project Specification

## Overview

**Sundus AI** is an intelligent WhatsApp chatbot built on the AI Sensy platform, powered by OpenAI's language models. The chatbot provides multilingual support (English/Arabic), handles customer inquiries, tracks orders, answers FAQs, and assists with product searches.

---

## Core Features & Feasibility Analysis

### 1. Smart Multilingual Responses (English/Arabic)

**Status:** ✅ **Highly Feasible**

**Description:**
- Sundus AI responds intelligently in both English and Arabic
- Uses OpenAI GPT models for natural language understanding and generation
- Automatically detects user language preference

**Technical Implementation:**
- **OpenAI Integration:** Use GPT-4 or GPT-3.5-turbo with multilingual capabilities
- **Language Detection:** Detect language from user input or maintain user preference
- **Prompt Engineering:** Craft system prompts that encourage bilingual responses
- **Context Management:** Maintain conversation context across messages

**Challenges:**
- Arabic RTL (Right-to-Left) text rendering in WhatsApp
- Mixed language conversations
- Cultural context understanding

**Solution:**
- Use OpenAI's native multilingual support
- Implement language detection middleware
- Store user language preference in session/conversation state

---

### 2. Feedback Mechanism: "Was this helpful?" with Quick Replies

**Status:** ✅ **Highly Feasible**

**Description:**
- After every bot response, send a follow-up message asking "Was this helpful?"
- Provide quick reply buttons: "Yes" and "No"
- Track feedback for analytics and improvement

**Technical Implementation:**
- **AI Sensy API:** Use interactive message templates with quick reply buttons
- **Message Structure:** Send feedback prompt as a separate message after main response
- **Quick Reply Format:** Use `QUICK_REPLY` message type with callback payloads
- **Feedback Tracking:** Store feedback in database for analytics

**Implementation Flow:**
```
1. User sends message
2. Bot generates response via OpenAI
3. Send main response to user
4. Send feedback prompt: "Was this helpful?" with Yes/No buttons
5. User clicks Yes/No → Store feedback
```

**Challenges:**
- Ensuring feedback doesn't interrupt conversation flow
- Handling feedback for different message types (text, media, etc.)

**Solution:**
- Always append feedback prompt after main response
- Use non-intrusive quick reply format
- Allow users to skip feedback (timeout after X seconds)

---

### 3. Human Agent Escalation

**Status:** ✅ **Feasible** (Requires AI Sensy Dashboard Integration)

**Description:**
- Track consecutive negative feedbacks (No responses)
- After N consecutive "No" responses, escalate to human agent
- Transfer conversation to AI Sensy dashboard for human handling

**Technical Implementation:**
- **Feedback Counter:** Track consecutive "No" responses per conversation
- **Threshold:** Configurable threshold (e.g., 3 consecutive "No"s)
- **Escalation Trigger:** When threshold reached:
  - Mark conversation as "needs human attention"
  - Send notification to AI Sensy dashboard
  - Optionally send message to user: "Connecting you with a human agent..."
  - Transfer conversation context to dashboard

**Implementation Flow:**
```
1. User clicks "No" on feedback
2. Increment negative feedback counter
3. If counter >= threshold (e.g., 3):
   - Set conversation status: "ESCALATED"
   - Send escalation notification to AI Sensy API
   - Notify user: "A human agent will assist you shortly"
   - Human agent takes over via AI Sensy dashboard
4. Reset counter when user clicks "Yes" or conversation escalates
```

**Challenges:**
- AI Sensy API for agent handover (need to verify API capabilities)
- Context transfer to human agent
- Resuming bot after human intervention

**Solution:**
- Research AI Sensy agent handover API
- Store full conversation context in database
- Implement conversation state management
- Add webhook for agent handover events

**Required Research:**
- AI Sensy agent handover API documentation
- Dashboard integration methods
- Conversation transfer protocols

---

### 4. Order Tracking with OTP Authentication

**Status:** ✅ **Feasible** (API Integration Confirmed)

**Description:**
- Users can track orders by providing order number
- System sends OTP to user's phone number via Alhomaidhi API
- OTP is delivered via SMS/email, then sent to user via WhatsApp
- User must verify OTP before receiving order details
- Secure authentication prevents unauthorized access

**Technical Implementation:**
- **OTP API:** Alhomaidhi Group API handles OTP generation and delivery
- **API Endpoints:**
  - `POST /number_verification` - Send OTP
  - `POST /otp_verification` - Verify OTP and get token
  - `POST /token_verification` - Validate token
  - `POST /resend_otp_request` - Resend OTP
  - `GET /list_orders` - List all user orders
  - `GET /retrieve_order?order_id={id}` - Get single order details
- **Authentication:** Token-based authentication after OTP verification
- **Token Storage:** Store token and user_id for authenticated requests
- **Order Lookup:** Use authenticated API calls to fetch order details

**Implementation Flow:**
```
1. User: "Track order #6317"
2. Check if user has valid token:
   - If yes: Validate token → Fetch order
   - If no: Proceed to authentication
3. Authentication Flow:
   a. Call POST /number_verification (phone_number)
   b. API sends OTP via SMS/email
   c. Send OTP to user via WhatsApp: "Your OTP is: 123456"
   d. Wait for user input: "123456"
   e. Call POST /otp_verification (phone_number, otp_code)
   f. Receive token and user_id
   g. Store token and user_id
4. Fetch Order:
   a. Call GET /retrieve_order?order_id=6317
      Headers: Authorization: {token}, user_id: {user_id}
   b. Format order details
   c. Send to user via WhatsApp
5. If OTP invalid: Allow retry or resend OTP
```

**API Details:**
- **Base URL:** `https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2`
- **Authentication:** Token in `Authorization` header (not Bearer format)
- **Order ID Format:** Accepts "6317" or "#6317"
- **Order Status:** WooCommerce format (wc-completed, wc-processing, etc.)

**Challenges:**
- Token expiration and validation
- OTP security and rate limiting
- Handling multiple order tracking requests
- Phone number format (remove country code for API)

**Solution:**
- Validate token before each API call
- Implement rate limiting (max 3 OTP requests per hour)
- Store tokens securely with expiration
- Normalize phone numbers (remove country code prefix for API)

**Required Integration:**
- ✅ Alhomaidhi Group Order API (confirmed)
- Database for token storage (session management)
- AI Sensy API for sending OTP via WhatsApp

**See:** [API Reference](./API_REFERENCE.md) for complete API documentation

---

### 5. FAQ System with Vector Database & AI Suggestions

**Status:** ✅ **Highly Feasible**

**Description:**
- **Base FAQs:** Admin-managed FAQ database
- **AI-Suggested FAQs:** System learns from conversations and suggests new FAQs
- **Admin Review:** Admins approve/reject AI suggestions
- **Self-Improving:** System continuously improves based on user interactions
- FAQs stored as embeddings in vector database
- Semantic search to find relevant FAQs
- Return best matching FAQ answer

**Technical Implementation:**
- **Vector Database:** Use Pinecone, Weaviate, or ChromaDB
- **Embeddings:** Use OpenAI's `text-embedding-3-small` or `text-embedding-ada-002`
- **FAQ Storage:**
  - MongoDB: FAQ metadata (question, answer, source, status)
  - Pinecone: Vector embeddings (for semantic search)
- **FAQ Sources:**
  - `manual`: Added by admin, immediately active
  - `ai_suggested`: Generated from conversations, pending review
- **FAQ Status:**
  - `active`: Available for users
  - `pending_review`: AI suggestion awaiting admin approval
  - `rejected`: AI suggestion rejected by admin
- **Search Process:**
  1. Convert user query to embedding
  2. Search vector database for similar FAQs
  3. Return top N matches (e.g., top 3)
  4. If similarity score > threshold, return FAQ answer
  5. Otherwise, fall back to OpenAI general response
- **AI Suggestion Process:**
  1. AI analyzes conversations after responses
  2. Detects frequently asked questions
  3. Identifies questions not covered by existing FAQs
  4. Suggests new FAQs with confidence scores
  5. Admin reviews and approves/rejects
  6. Approved FAQs become active

**Implementation Flow:**
```
1. User asks question
2. Generate embedding for user query
3. Vector search in FAQ database
4. If top match similarity > 0.85:
   - Return FAQ answer
5. Else:
   - Use OpenAI to generate response
   - Optionally: Suggest similar FAQs
```

**Challenges:**
- Vector database setup and maintenance
- Embedding costs (OpenAI API)
- FAQ quality and relevance
- Multilingual FAQ support

**Solution:**
- Use cost-effective embedding model (`text-embedding-3-small`)
- Batch embed FAQs to reduce API calls
- Implement FAQ versioning and admin review
- Support multilingual FAQs (separate embeddings or multilingual model)

**Database Schema:**
```typescript
interface FAQ {
  _id: ObjectId;
  question: string;        // FAQ question
  answer: string;          // Answer text (EN)
  answer_ar?: string;      // Arabic answer (optional)
  category?: string;       // FAQ category
  vector_id: string;       // Pinecone vector ID
  
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

**Storage:**
- **MongoDB:** FAQ metadata (question, answer, source, status, usage stats)
- **Pinecone:** Vector embeddings (for semantic search)

**Required Setup:**
- Vector database (Pinecone/Weaviate/ChromaDB)
- MongoDB for FAQ metadata
- Admin dashboard/API for FAQ management
- Embedding generation pipeline
- AI suggestion system (analyzes conversations)

**See:** [AI FAQ Suggestions](./AI_FAQ_SUGGESTIONS.md) for complete AI suggestion system

---

### 6. Product Search (SKU/Brand)

**Status:** ✅ **Feasible** (API Integration Confirmed)

**Description:**
- Users can search products by SKU or brand name
- Bot returns product details: name, price, description, images
- Includes link to product page
- Supports both English and Arabic product names

**Technical Implementation:**
- **Product API:** Alhomaidhi Group API provides product search
- **API Endpoints:**
  - `GET /retrieve_brands` - Get all brands
  - `GET /list_products?search={query}` - Search products
  - `GET /retrieve_product?product_id={id}` - Get single product details
- **Search Methods:**
  - SKU search: Use `search` parameter with SKU
  - Brand search: Use `search` parameter with brand name
  - Text search: Use `search` parameter with product name/keywords
- **Response Format:**
  - Product name (bilingual: English / Arabic)
  - Price (regular_price, sale_price, discount_percentage)
  - Description (HTML formatted)
  - Product images (multiple images)
  - Brand information
  - Stock status and quantity
  - Product link: `https://alhomaidhigroup.com/product/{slug}`

**Implementation Flow:**
```
1. User: "Search product MTTS2F504" or "Find Aston Martin watches"
2. Parse query:
   - Detect SKU pattern (alphanumeric, 6+ chars)
   - Detect brand name or product keywords
3. Search Products:
   a. If brand search: Optionally call GET /retrieve_brands first
   b. Call GET /list_products?search={query}
      Headers: Authorization, user_id, Cookie (language)
4. Process Results:
   - If single match: Call GET /retrieve_product for full details
   - If multiple: Show top 5 products with images
   - If none: "No products found. Try different keywords."
5. Format Response:
   - Product name (bilingual)
   - Price with discount if on sale
   - Stock status
   - Product image
   - Link: https://alhomaidhigroup.com/product/{slug}
```

**API Details:**
- **Base URL:** `https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2`
- **Search Parameter:** Single `search` parameter handles SKU, brand, and text search
- **Pagination:** `page` and `per_page` parameters available
- **Language:** Controlled via `Cookie: pll_language=en` or `ar`
- **Product Structure:**
  - `product_details`: SKU, name, price, stock, description
  - `images`: Array of product images
  - `brands`: Brand information
  - `related_product_ids`: Related products

**Challenges:**
- Search accuracy for brand names (fuzzy matching)
- Handling large result sets
- Multilingual product names in search
- Product image display in WhatsApp

**Solution:**
- Use API's built-in search (handles SKU, brand, text)
- Limit results to top 5 for display
- Support both English and Arabic in search query
- Send product images via WhatsApp media messages
- Generate product page links using slug

**Product Response Structure:**
```typescript
{
  product_details: {
    product_id: number,
    name: string,              // Bilingual: "English / Arabic"
    sku: string,              // For SKU search
    price: string,
    regular_price: string,
    sale_price: string,
    discount_percentage: string,
    on_sale: boolean,
    stock_status: "instock" | "outofstock",
    stock_quantity: number,
    description: string,      // HTML formatted
    slug: string             // For product URL
  },
  images: [{ src: string, alt: string }],
  brands: [{ id: number, name: string, slug: string }],
  related_product_ids: number[]
}
```

**Required Integration:**
- ✅ Alhomaidhi Group Product API (confirmed)
- AI Sensy API for sending product images
- Product URL generation from slug

**See:** [API Reference](./API_REFERENCE.md) for complete API documentation

---

## Technical Architecture

### Agentic Architecture

Sundus AI uses an **agentic approach** where OpenAI's function calling feature enables the AI to intelligently decide when to call APIs and tools. This allows for natural conversations without requiring explicit commands.

**Key Principles:**
- **AI-Driven Decisions:** OpenAI decides when to call tools based on user intent
- **Function Calling:** Uses OpenAI's tool use feature for API calls
- **Natural Conversations:** No need for explicit commands - AI understands context
- **Modular Design:** One file per operation for maintainability and scalability

### System Components

```
┌─────────────────┐
│  WhatsApp User  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Sensy API  │
│  (Webhook In)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Sundus AI Backend Server       │
│  ┌───────────────────────────────┐  │
│  │   Webhook Handler             │  │
│  │   - Parse incoming messages   │  │
│  │   - Extract message data      │  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │   Message Handler             │  │
│  │   - Load conversation context │  │
│  │   - Prepare message history   │  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │   AI Agent (OpenAI)            │  │
│  │   - Function Calling           │  │
│  │   - Decides: Tool or Direct?   │  │
│  │   - Available Tools:           │  │
│  │     • search_products          │  │
│  │     • track_order              │  │
│  │     • search_faqs               │  │
│  │     • list_brands              │  │
│  └───────┬───────────┬────────────┘  │
│          │           │               │
│  ┌───────▼───────────▼────────────┐  │
│  │   Tool Executors               │  │
│  │   - Product Executor           │  │
│  │   - Order Executor             │  │
│  │   - FAQ Executor               │  │
│  │   - Brand Executor             │  │
│  └───────┬───────────┬────────────┘  │
│          │           │               │
│  ┌───────▼───────────▼────────────┐  │
│  │   Services Layer              │  │
│  │   - Business Logic            │  │
│  │   - API Orchestration         │  │
│  └───────┬───────────┬────────────┘  │
│          │           │               │
│  ┌───────▼───────────▼────────────┐  │
│  │   API Clients                 │  │
│  │   - Alhomaidhi API            │  │
│  │   - AI Sensy API              │  │
│  │   - Vector DB                 │  │
│  └───────┬───────────────────────┘  │
│          │                           │
│  ┌───────▼───────────────────────┐  │
│  │   Response Generator          │  │
│  │   - Format AI response        │  │
│  │   - Add feedback prompt       │  │
│  └───────┬───────────────────────┘  │
└──────────┼───────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   AI Sensy API (Send Message)       │
└─────────────────────────────────────┘
```

**See:** [Architecture](./ARCHITECTURE.md) for detailed architecture
**See:** [Code Structure](./CODE_STRUCTURE.md) for modular code organization

### External Services

1. **OpenAI API**
   - GPT-4 or GPT-3.5-turbo for chat
   - `text-embedding-3-small` for FAQ embeddings

2. **Vector Database**
   - Pinecone (recommended) or Weaviate/ChromaDB

3. **Alhomaidhi Group API** ✅
   - Product search and retrieval
   - Brand listing
   - Order tracking
   - OTP authentication
   - Base URL: `https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2`

4. **AI Sensy API**
   - Webhook receiving
   - Message sending
   - Agent handover (if available)

**See:** [API Reference](./API_REFERENCE.md) for complete API documentation

### Database Schema

```typescript
// Conversation tracking
interface Conversation {
  id: string;
  phone_number: string;
  contact_id: string;
  language: 'en' | 'ar' | 'auto';
  status: 'active' | 'escalated' | 'closed';
  negative_feedback_count: number;
  last_feedback: 'yes' | 'no' | null;
  created_at: Date;
  updated_at: Date;
}

// OTP storage
interface OTP {
  id: string;
  phone_number: string;
  order_number?: string;
  otp_code: string;
  expires_at: Date;
  verified: boolean;
  created_at: Date;
}

// Feedback tracking
interface Feedback {
  id: string;
  conversation_id: string;
  message_id: string;
  feedback: 'yes' | 'no';
  created_at: Date;
}

// FAQ (metadata, embeddings in vector DB)
interface FAQMetadata {
  id: string;
  question: string;
  answer: string;
  answer_ar?: string;
  category?: string;
  vector_id: string; // ID in vector database
  created_at: Date;
  updated_at: Date;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Express server with webhook endpoint
- [ ] Integrate OpenAI API
- [ ] Basic message routing
- [ ] Language detection
- [ ] Simple text response with OpenAI

### Phase 2: Core Features (Week 3-4)
- [ ] Feedback mechanism ("Was this helpful?")
- [ ] Feedback tracking and storage
- [ ] Conversation state management
- [ ] Multilingual response support

### Phase 3: Advanced Features (Week 5-6)
- [ ] FAQ system setup (vector database)
- [ ] FAQ embedding generation
- [ ] FAQ search implementation
- [ ] Admin API for FAQ management

### Phase 4: Order Tracking (Week 7-8)
- [ ] OTP generation and delivery
- [ ] OTP verification system
- [ ] Order system integration
- [ ] Order details formatting

### Phase 5: Product Search (Week 9-10)
- [ ] Product database integration
- [ ] Search implementation (SKU/Brand)
- [ ] Product response formatting
- [ ] Link generation

### Phase 6: Escalation (Week 11-12)
- [ ] Negative feedback tracking
- [ ] Escalation threshold logic
- [ ] AI Sensy agent handover integration
- [ ] Escalation notifications

### Phase 7: Polish & Testing (Week 13-14)
- [ ] Error handling
- [ ] Rate limiting
- [ ] Logging and monitoring
- [ ] Performance optimization
- [ ] End-to-end testing

---

## Additional Feature Suggestions

### 1. **Conversation History & Context**
- Store full conversation history
- Maintain context across sessions
- User can reference previous messages
- "Remember my last order" functionality

### 2. **Personalized Recommendations**
- Analyze user purchase history
- Recommend products based on preferences
- "You might also like" suggestions

### 3. **Order Placement via Chatbot**
- Allow users to place orders directly
- Cart management in conversation
- Order confirmation via WhatsApp

### 4. **Delivery Notifications**
- Real-time order status updates
- Delivery tracking
- Delivery confirmation requests

### 5. **Customer Support Ticketing**
- Create support tickets from chat
- Track ticket status
- Link tickets to orders/products

### 6. **Multimedia Support**
- Handle product images
- Send product catalogs
- Video tutorials/guides

### 7. **Loyalty Program Integration**
- Check loyalty points balance
- Redeem points
- Show available rewards

### 8. **Appointment Scheduling**
- Book appointments/consultations
- Calendar integration
- Reminder notifications

### 9. **Surveys & Feedback Collection**
- Post-purchase surveys
- Product feedback collection
- Customer satisfaction metrics

### 10. **Smart Notifications**
- Abandoned cart reminders
- Back-in-stock alerts
- Price drop notifications
- Promotional messages

### 11. **Voice Message Support**
- Handle voice messages
- Transcribe to text
- Respond with voice (optional)

### 12. **Location-Based Services**
- Store locator
- Delivery area check
- Nearest store information

### 13. **Payment Integration**
- Payment link generation
- Payment status tracking
- Invoice generation

### 14. **Multi-Agent Support**
- Different agents for different departments
- Route to appropriate agent
- Department-specific FAQs

### 15. **Analytics Dashboard**
- Conversation analytics
- User satisfaction metrics
- Popular queries/FAQs
- Escalation rate tracking

---

## Technology Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Language:** TypeScript

### AI/ML
- **LLM:** OpenAI GPT-4 or GPT-3.5-turbo
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Vector DB:** Pinecone (recommended) or Weaviate/ChromaDB

### Database
- **Primary:** MongoDB (user sessions, feedback, FAQ metadata)
- **Vector:** Pinecone (FAQ embeddings for semantic search)

### External APIs
- **WhatsApp:** AI Sensy API
- **AI:** OpenAI API
- **Products & Orders:** Alhomaidhi Group API ✅
  - Product search and retrieval
  - Order tracking
  - OTP authentication
- **See:** [API Reference](./API_REFERENCE.md) for complete API documentation

### DevOps
- **Environment:** Node.js 18+
- **Package Manager:** npm
- **Process Manager:** PM2 (production)
- **Monitoring:** (To be determined)

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-...

# AI Sensy
AISENSY_API_KEY=...
AISENSY_PROJECT_ID=...
AISENSY_WEBHOOK_SECRET=...

# Vector Database (Pinecone)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=sundus-faqs

# Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/sundus_ai

# Alhomaidhi Group API
ALHOMAIDHI_API_BASE_URL=https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2
ALHOMAIDHI_API_KEY=550699352X72qodSOlbkS6exhCg4KM8ACjJkg3ZKz2Y6138rjtXG47XNSoM

# Configuration
ESCALATION_THRESHOLD=3
OTP_EXPIRY_MINUTES=5
OTP_RATE_LIMIT=3
FAQ_SIMILARITY_THRESHOLD=0.85
```

---

## Security Considerations & Guardrails

### Critical Guardrails

1. **Content Moderation**
   - OpenAI Moderation API for all user inputs
   - Response content filtering
   - Block harmful/inappropriate content

2. **Prompt Injection Prevention**
   - Input sanitization
   - System prompt protection
   - Conversation boundary enforcement

3. **Tool Call Validation**
   - Parameter validation before execution
   - Authorization checks
   - Rate limiting on tool calls

4. **Input/Output Validation**
   - Sanitize all inputs
   - Filter all outputs
   - Validate data formats

5. **Rate Limiting**
   - Per-user message limits
   - Tool call limits
   - API call limits
   - OTP request limits

6. **Token & Context Management**
   - Token limit enforcement
   - Context window management
   - Cost controls

### Security Measures

1. **API Key Security**
   - Store keys in environment variables
   - Never commit keys to repository
   - Use secret management service in production

2. **OTP Security**
   - Cryptographically secure random generation
   - Rate limiting (max 3 per hour per number)
   - Short expiration (5 minutes)
   - One-time use only

3. **Data Privacy**
   - Encrypt sensitive data (phone numbers, order info)
   - GDPR compliance
   - User data retention policies

4. **Authentication & Authorization**
   - OTP-based authentication
   - Token validation
   - User verification

5. **Error Handling**
   - Never expose internal errors
   - Generic error messages
   - Secure error logging

**See:** [Guardrails Documentation](./GUARDRAILS.md) for complete guardrails implementation

---

## Success Metrics

1. **Response Quality**
   - User satisfaction rate (feedback)
   - Escalation rate (target: <10%)
   - Average response time

2. **Feature Usage**
   - Order tracking requests
   - FAQ queries vs. general chat
   - Product searches

3. **Engagement**
   - Daily active users
   - Messages per conversation
   - Return user rate

4. **Technical**
   - API response time
   - Error rate
   - Uptime

---

## Next Steps

1. **Research & Planning**
   - [ ] Verify AI Sensy agent handover API
   - [ ] Identify order system integration method
   - [ ] Identify product catalog system
   - [ ] Set up vector database account

2. **Development Setup**
   - [ ] Initialize project structure
   - [ ] Set up TypeScript configuration
   - [ ] Configure environment variables
   - [ ] Set up database connections

3. **Begin Implementation**
   - [ ] Start with Phase 1 (Foundation)
   - [ ] Implement webhook handler
   - [ ] Integrate OpenAI
   - [ ] Test basic flow

---

## Questions to Resolve

1. **AI Sensy API**
   - How to send messages back to users?
   - Agent handover API documentation?
   - Interactive message templates support?

2. **Alhomaidhi Group API** ✅ (Resolved)
   - ✅ Product API endpoints confirmed
   - ✅ Order API endpoints confirmed
   - ✅ OTP authentication flow confirmed
   - ⚠️ API key management (store securely)

3. **Admin Panel**
   - Do we need a separate admin dashboard?
   - Or API-only for FAQ management?

4. **Deployment**
   - Hosting platform preference?
   - CI/CD pipeline?
   - Monitoring and logging tools?

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

