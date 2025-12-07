# Sundus AI - Code Structure & Architecture

## Overview

Sundus AI follows a **modular, agentic architecture** where:
- **Agentic:** AI (OpenAI) decides when to call functions/tools using function calling
- **Modular:** One file per operation/concern for maintainability and scalability
- **Clean Code:** Separation of concerns, single responsibility principle

---

## Project Structure

```
sundus_ai_backend/
├── src/
│   ├── app.ts                          # Express server entry point
│   ├── config/
│   │   ├── index.ts                    # Configuration management
│   │   ├── openai.ts                   # OpenAI client configuration
│   │   ├── database.ts                 # Database connection
│   │   └── env.ts                      # Environment variables validation
│   ├── handlers/
│   │   ├── webhook.handler.ts          # Webhook reception & parsing
│   │   └── message.handler.ts          # Main message processing entry
│   ├── agent/
│   │   ├── index.ts                    # AI Agent orchestrator
│   │   ├── tools/
│   │   │   ├── index.ts                # Tool registry & definitions
│   │   │   ├── product.tools.ts        # Product search tools
│   │   │   ├── order.tools.ts          # Order tracking tools
│   │   │   ├── faq.tools.ts            # FAQ search tools
│   │   │   └── brand.tools.ts          # Brand listing tools
│   │   └── executor/
│   │       ├── index.ts                # Tool execution orchestrator
│   │       ├── product.executor.ts      # Product tool execution
│   │       ├── order.executor.ts       # Order tool execution
│   │       ├── faq.executor.ts         # FAQ tool execution
│   │       └── brand.executor.ts      # Brand tool execution
│   ├── services/
│   │   ├── openai.service.ts           # OpenAI API wrapper
│   │   ├── aisensy.service.ts          # AI Sensy API wrapper
│   │   ├── alhomaidhi.service.ts       # Alhomaidhi API wrapper
│   │   ├── vector.service.ts           # Vector DB service
│   │   └── conversation.service.ts    # Conversation state management
│   ├── api/
│   │   ├── alhomaidhi/
│   │   │   ├── auth.api.ts             # Authentication APIs (OTP)
│   │   │   ├── product.api.ts          # Product APIs
│   │   │   ├── order.api.ts            # Order APIs
│   │   │   └── brand.api.ts           # Brand APIs
│   │   └── aisensy/
│   │       ├── message.api.ts          # Send message API
│   │       └── webhook.api.ts          # Webhook types
│   ├── models/
│   │   ├── user-session.model.ts       # User session data model
│   │   ├── conversation-message.model.ts  # Message data model (for storage)
│   │   ├── feedback.model.ts           # Feedback data model
│   │   └── faq.model.ts                # FAQ data model
│   ├── repositories/
│   │   ├── user-session.repository.ts      # User session DB operations
│   │   ├── conversation-message.repository.ts  # Message storage (last 20 per user)
│   │   ├── feedback.repository.ts          # Feedback DB operations
│   │   └── faq.repository.ts               # FAQ DB operations
│   ├── guardrails/
│   │   ├── index.ts                    # Main guardrails orchestrator
│   │   ├── content.moderation.ts       # Content moderation
│   │   ├── prompt.injection.ts         # Prompt injection prevention
│   │   ├── tool.validation.ts          # Tool call validation
│   │   ├── input.validation.ts         # Input validation
│   │   ├── output.filtering.ts         # Output filtering
│   │   ├── rate.limiting.ts            # Rate limiting
│   │   ├── token.management.ts        # Token/context management
│   │   ├── error.handling.ts           # Error handling guardrails
│   │   └── auth.guardrails.ts         # Authentication guardrails
│   ├── utils/
│   │   ├── logger.ts                   # Logging utility
│   │   ├── validator.ts                # Input validation
│   │   ├── formatter.ts                # Response formatting
│   │   ├── phone.util.ts               # Phone number utilities
│   │   └── error.util.ts               # Error handling utilities
│   ├── middleware/
│   │   ├── error.middleware.ts         # Error handling middleware
│   │   ├── logger.middleware.ts        # Request logging
│   │   └── validation.middleware.ts    # Request validation
│   └── types/
│       ├── webhook.types.ts            # Webhook payload types
│       ├── message.types.ts            # Message types
│       ├── tool.types.ts                # Tool function types
│       └── api.types.ts                 # API response types
├── docs/                                # Documentation
├── tests/                               # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

---

## Module Responsibilities

### 1. Entry Point (`app.ts`)

**Purpose:** Express server setup and route registration

**Responsibilities:**
- Initialize Express server
- Register middleware
- Register routes
- Error handling setup
- Server startup

**Code Structure:**
```typescript
// app.ts
import express from 'express';
import { webhookRouter } from './routes/webhook.route';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();
app.use(express.json());
app.use('/webhook', webhookRouter);
app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

---

### 2. Configuration (`config/`)

**Purpose:** Centralized configuration management

**Files:**
- `config/index.ts` - Main config export
- `config/openai.ts` - OpenAI client setup
- `config/database.ts` - Database connection
- `config/env.ts` - Environment variable validation

**Example:**
```typescript
// config/openai.ts
import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// config/env.ts
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  AISENSY_API_KEY: process.env.AISENSY_API_KEY!,
  // ... validate all env vars
};
```

---

### 3. Handlers (`handlers/`)

**Purpose:** Request handling and orchestration

#### `webhook.handler.ts`
- Receive webhook from AI Sensy
- Parse and validate payload
- Extract message data
- Call message handler

#### `message.handler.ts`
- Main entry point for message processing
- Load recent messages from database (last 20 per user)
- Handle message replies (fetch original message if `replied_to_message_id` exists)
- Build complete conversation history (recent messages + reply context + current)
- Call AI agent with full context
- Handle agent response
- Store messages in database (user message + AI response)
- Auto-cleanup old messages (keep last 20)
- Send response via AI Sensy

**Context Management:**
- **Stored:** Last 20 messages per user in `conversation_messages` collection
- **Purpose:** Better context for OpenAI, AI FAQ suggestions, analytics, debugging
- **Auto-cleanup:** Older messages automatically removed (keep last 20)
- **Why:** Context is critical for natural conversations and AI FAQ suggestions

**Reply Handling:**
When a message contains `replied_to_message_id`, the handler automatically fetches the original message using `aisensyService.getMessageDetails()` and adds it to conversation history. This ensures OpenAI has full context without needing a tool call.

**See:** 
- [Message Reply Handling](../development/MESSAGE_REPLY_HANDLING.md) for implementation details
- [Conversation Storage Analysis](../database/CONVERSATION_STORAGE_ANALYSIS.md) for storage rationale

---

### 4. Agent (`agent/`)

**Purpose:** AI agent with function calling capabilities

#### `agent/index.ts`
- Main agent orchestrator
- Manages conversation history
- Calls OpenAI with tools
- Handles tool execution
- Formats agent responses

#### `agent/tools/`
**Purpose:** Define available tools/functions for AI

**Files:**
- `index.ts` - Tool registry (exports all tool definitions)
- `product.tools.ts` - Product search tools
- `order.tools.ts` - Order tracking tools
- `faq.tools.ts` - FAQ search tools
- `brand.tools.ts` - Brand listing tools

**Example:**
```typescript
// agent/tools/product.tools.ts
export const productTools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search for products by SKU, brand, or keywords",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a specific product",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "number", description: "Product ID" }
        },
        required: ["product_id"]
      }
    }
  }
];
```

#### `agent/executor/`
**Purpose:** Execute tool functions when AI calls them

**Files:**
- `index.ts` - Tool execution router
- `product.executor.ts` - Execute product tools
- `order.executor.ts` - Execute order tools
- `faq.executor.ts` - Execute FAQ tools
- `brand.executor.ts` - Execute brand tools

**Example:**
```typescript
// agent/executor/product.executor.ts
export async function executeProductTool(
  toolName: string,
  args: any
): Promise<any> {
  switch (toolName) {
    case "search_products":
      return await productService.search(args.query);
    case "get_product_details":
      return await productService.getDetails(args.product_id);
    default:
      throw new Error(`Unknown product tool: ${toolName}`);
  }
}
```

---

### 5. Services (`services/`)

**Purpose:** Business logic and external API wrappers

#### `openai.service.ts`
- OpenAI API wrapper
- Chat completion
- Embedding generation
- Error handling

#### `aisensy.service.ts`
- AI Sensy API wrapper
- Send text messages
- Send media messages
- Send quick replies
- Handle webhook responses

#### `alhomaidhi.service.ts`
- Alhomaidhi API wrapper
- Product operations
- Order operations
- Authentication operations
- Error handling and retries

#### `vector.service.ts`
- Vector database operations
- FAQ embedding search
- FAQ management

#### `conversation.service.ts`
- Conversation state management
- Context tracking
- History management
- Language detection

---

### 6. API Clients (`api/`)

**Purpose:** Low-level API clients (HTTP requests)

#### `api/alhomaidhi/`
- `auth.api.ts` - OTP send/verify APIs
- `product.api.ts` - Product search/retrieve APIs
- `order.api.ts` - Order list/retrieve APIs
- `brand.api.ts` - Brand list API

**Example:**
```typescript
// api/alhomaidhi/product.api.ts
export async function searchProducts(query: string): Promise<ProductResponse> {
  const response = await axios.get(
    `${BASE_URL}/list_products`,
    {
      params: { search: query },
      headers: { Authorization: API_KEY, user_id: USER_ID }
    }
  );
  return response.data;
}
```

#### `api/aisensy/`
- `message.api.ts` - Send message API
- `webhook.api.ts` - Webhook type definitions

---

### 7. Models (`models/`)

**Purpose:** Data models and TypeScript interfaces

**Files:**
- `user-session.model.ts` - User session data structure
- `conversation-message.model.ts` - Message data structure (for storage)
- `feedback.model.ts` - Feedback data structure
- `faq.model.ts` - FAQ data structure

**Example:**
```typescript
// models/conversation-message.model.ts
export interface ConversationMessage {
  _id?: ObjectId;
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

// models/user-session.model.ts
export interface UserSession {
  _id?: ObjectId;
  phone_number: string;
  contact_id: string;
  language: 'en' | 'ar' | 'auto';
  status: 'active' | 'escalated' | 'closed';
  negative_feedback_count: number;
  token?: string; // For authenticated users
  user_id?: string;
  created_at: Date;
  updated_at: Date;
}
```

---

### 8. Repositories (`repositories/`)

**Purpose:** Database operations (data access layer)

**Files:**
- `user-session.repository.ts` - User session CRUD
- `conversation-message.repository.ts` - Message storage (last 20 per user, auto-cleanup)
- `feedback.repository.ts` - Feedback CRUD
- `faq.repository.ts` - FAQ CRUD

**Example:**
```typescript
// repositories/conversation-message.repository.ts
export class ConversationMessageRepository {
  // Store message (user or assistant)
  async storeMessage(phoneNumber: string, message: ConversationMessage): Promise<void> {
    await db.conversation_messages.insertOne({
      phone_number: phoneNumber,
      ...message,
      timestamp: new Date()
    });
    
    // Auto-cleanup: Keep only last 20 messages
    await this.cleanupOldMessages(phoneNumber, 20);
  }
  
  // Load recent messages (last 20)
  async getRecentMessages(phoneNumber: string, limit: number = 20): Promise<ConversationMessage[]> {
    return await db.conversation_messages
      .find({ phone_number: phoneNumber })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
  
  // Auto-cleanup old messages
  async cleanupOldMessages(phoneNumber: string, keepCount: number): Promise<void> {
    const messages = await this.getRecentMessages(phoneNumber, keepCount + 1);
    if (messages.length > keepCount) {
      const oldest = messages[messages.length - 1];
      await db.conversation_messages.deleteMany({
        phone_number: phoneNumber,
        timestamp: { $lt: oldest.timestamp }
      });
    }
  }
}
```

---

### 9. Utils (`utils/`)

**Purpose:** Utility functions and helpers

**Files:**
- `logger.ts` - Logging utility (Winston/Pino)
- `validator.ts` - Input validation
- `formatter.ts` - Response formatting
- `phone.util.ts` - Phone number normalization
- `error.util.ts` - Error handling utilities

---

### 10. Middleware (`middleware/`)

**Purpose:** Express middleware

**Files:**
- `error.middleware.ts` - Global error handler
- `logger.middleware.ts` - Request logging
- `validation.middleware.ts` - Request validation

---

### 10. Guardrails (`guardrails/`)

**Purpose:** Safety mechanisms and guardrails for AI agent

**Files:**
- `index.ts` - Main guardrails orchestrator
- `content.moderation.ts` - Content moderation (OpenAI Moderation API)
- `prompt.injection.ts` - Prompt injection prevention
- `tool.validation.ts` - Tool call parameter validation
- `input.validation.ts` - Input sanitization and validation
- `output.filtering.ts` - Output content filtering
- `rate.limiting.ts` - Rate limiting per user/conversation
- `token.management.ts` - Token limits and context management
- `error.handling.ts` - Error handling and fallbacks
- `auth.guardrails.ts` - Authentication and authorization checks

**Guardrails Flow:**
```
User Message
  ↓
Input Validation → Content Moderation → Prompt Injection Check
  ↓
Rate Limiting Check
  ↓
Process with AI
  ↓
Tool Call Validation (if tool called)
  ↓
Output Filtering
  ↓
Send Response
```

**See:** [Guardrails Documentation](../development/GUARDRAILS.md) for complete details

---

### 11. Types (`types/`)

**Purpose:** TypeScript type definitions

**Files:**
- `webhook.types.ts` - Webhook payload types
- `message.types.ts` - Message types
- `tool.types.ts` - Tool function types
- `api.types.ts` - API response types

---

## Agentic Flow

### Message Processing Flow (with Guardrails)

```
1. Webhook Received
   ↓
2. webhook.handler.ts
   - Parse payload
   - Extract message
   ↓
3. Guardrails: Input Validation
   - Sanitize input
   - Validate format
   - Check length
   ↓
4. Guardrails: Content Moderation
   - Check for harmful content
   - Block if flagged
   ↓
5. Guardrails: Prompt Injection Check
   - Detect injection patterns
   - Sanitize if needed
   ↓
6. Guardrails: Rate Limiting
   - Check user rate limits
   - Block if exceeded
   ↓
7. message.handler.ts
   - Load conversation context
   - Prepare message history
   ↓
8. Guardrails: Token Management
   - Check token limits
   - Trim context if needed
   ↓
9. agent/index.ts
   - Call OpenAI with tools
   - AI decides: call tool or respond directly
   ↓
10a. If AI calls tool:
     - Guardrails: Tool Validation
       * Validate parameters
       * Check authorization
       * Rate limit tool calls
     - agent/executor/ routes to appropriate executor
     - Executor calls service
     - Service calls API client
     - Result returned to AI
     ↓
10b. If AI responds directly:
     - Format response
     ↓
11. Guardrails: Output Filtering
    - Filter sensitive info
    - Validate response format
    - Check content safety
    ↓
12. message.handler.ts
    - Add feedback prompt
    - Send via aisensy.service.ts
```

### Tool Execution Flow

```
AI decides to call: search_products("Nike watches")
   ↓
agent/index.ts detects tool call
   ↓
agent/executor/index.ts routes to product.executor.ts
   ↓
product.executor.ts calls productService.search()
   ↓
productService (in services/) calls productAPI.searchProducts()
   ↓
productAPI (in api/alhomaidhi/) makes HTTP request
   ↓
Result flows back up:
   API Response → Service → Executor → Agent → AI
   ↓
AI formats response with product data
   ↓
Send to user via WhatsApp
```

---

## Code Organization Principles

### 1. Single Responsibility
- Each file has one clear purpose
- One operation per file
- Clear separation of concerns

### 2. Dependency Flow
```
Handler → Agent → Executor → Service → API Client → External API
         ↓
      Repository → Database
```

### 3. Layer Separation
- **Handlers:** Request/response handling
- **Agent:** AI orchestration
- **Executors:** Tool execution routing
- **Services:** Business logic
- **API Clients:** HTTP requests
- **Repositories:** Database operations

### 4. Modularity
- Easy to add new tools (add to `tools/` and `executor/`)
- Easy to add new APIs (add to `api/` and `services/`)
- Easy to test (mock at any layer)

### 5. Scalability
- Horizontal scaling (stateless design)
- Easy to add new features
- Clear extension points

---

## Adding a New Tool

### Step 1: Define Tool
```typescript
// agent/tools/newfeature.tools.ts
export const newFeatureTools = [
  {
    type: "function",
    function: {
      name: "new_feature_action",
      description: "Description of what this does",
      parameters: { /* ... */ }
    }
  }
];
```

### Step 2: Register Tool
```typescript
// agent/tools/index.ts
export * from './newfeature.tools';
// Add to tools array
```

### Step 3: Create Executor
```typescript
// agent/executor/newfeature.executor.ts
export async function executeNewFeatureTool(
  toolName: string,
  args: any
): Promise<any> {
  switch (toolName) {
    case "new_feature_action":
      return await newFeatureService.action(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

### Step 4: Register Executor
```typescript
// agent/executor/index.ts
import { executeNewFeatureTool } from './newfeature.executor';
// Add to executor router
```

### Step 5: Create Service (if needed)
```typescript
// services/newfeature.service.ts
export class NewFeatureService {
  async action(params: any) {
    // Business logic
    return await newFeatureAPI.call(params);
  }
}
```

### Step 6: Create API Client (if needed)
```typescript
// api/external/newfeature.api.ts
export async function callNewFeatureAPI(params: any) {
  // HTTP request
}
```

---

## Testing Strategy

### Unit Tests
- Test each module in isolation
- Mock dependencies
- Test business logic

### Integration Tests
- Test service → API client flow
- Test executor → service flow
- Test with mock APIs

### E2E Tests
- Test full flow: webhook → agent → tool → response
- Test with real APIs (staging environment)

---

## Best Practices

1. **Guardrails First**
   - Apply guardrails at every layer
   - Never skip validation
   - Fail securely (default to blocking)

2. **Error Handling**
   - Use try-catch at service layer
   - Return structured errors
   - Log errors with context
   - Never expose internal errors to users

3. **Logging**
   - Log at each layer
   - Include request IDs
   - Log tool calls and results
   - Log all guardrail actions

4. **Type Safety**
   - Use TypeScript strictly
   - Define types for all data structures
   - Validate inputs at boundaries

5. **Configuration**
   - All config in `config/`
   - Environment variables validated
   - No hardcoded values
   - Guardrail settings configurable

6. **Security**
   - Input validation always
   - Output filtering always
   - Rate limiting always
   - Authentication checks always

7. **Documentation**
   - JSDoc comments for functions
   - README for each major module
   - API documentation
   - Guardrails documentation

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

