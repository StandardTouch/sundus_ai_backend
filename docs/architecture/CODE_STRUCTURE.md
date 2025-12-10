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
│   │   ├── database.ts                 # Database connection & indexes
│   │   ├── aisensy.config.ts           # AI Sensy API configuration
│   │   └── smtp.config.ts             # SMTP email configuration
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
│   ├── auth/                           # Authentication module
│   │   ├── controllers/                # One file per endpoint
│   │   │   ├── login.controller.ts     # POST /api/auth/login
│   │   │   ├── me.controller.ts        # GET /api/auth/me
│   │   │   ├── logout.controller.ts    # POST /api/auth/logout
│   │   │   ├── forgot-password.controller.ts  # POST /api/auth/forgot-password
│   │   │   ├── verify-otp.controller.ts        # POST /api/auth/verify-otp
│   │   │   └── reset-password.controller.ts     # POST /api/auth/reset-password
│   │   ├── services/                   # Business logic
│   │   │   ├── auth.service.ts         # Authentication logic
│   │   │   ├── otp.service.ts         # OTP generation & verification
│   │   │   └── password-reset-token.service.ts  # Password reset tokens
│   │   ├── routes/
│   │   │   └── auth.routes.ts          # Auth route definitions
│   │   └── index.ts                   # Module exports
│   ├── users/                          # User management module
│   │   ├── controllers/                # One file per endpoint
│   │   │   ├── getAllUsers.controller.ts    # GET /api/users
│   │   │   ├── getUserById.controller.ts    # GET /api/users/:id
│   │   │   ├── createUser.controller.ts     # POST /api/users
│   │   │   ├── updateUser.controller.ts      # PUT /api/users/:id
│   │   │   └── deleteUser.controller.ts     # DELETE /api/users/:id
│   │   ├── services/
│   │   │   └── user.service.ts         # User management business logic
│   │   ├── routes/
│   │   │   └── user.routes.ts          # User route definitions
│   │   └── index.ts                   # Module exports
│   ├── settings/                       # Settings management module
│   │   ├── controllers/                # One file per endpoint
│   │   │   ├── getWebhookStatus.controller.ts   # GET /api/settings/webhook/status
│   │   │   └── toggleWebhookStatus.controller.ts # POST /api/settings/webhook/toggle
│   │   ├── services/
│   │   │   └── settings.service.ts     # Settings business logic
│   │   ├── routes/
│   │   │   └── settings.routes.ts     # Settings route definitions
│   │   └── index.ts                   # Module exports
│   ├── services/
│   │   ├── aisensy.service.ts          # AI Sensy API wrapper
│   │   └── cleanup.service.ts          # Periodic cleanup service
│   ├── api/
│   │   └── aisensy/
│   │       ├── message.api.ts          # Send message API
│   │       └── index.ts               # API exports
│   ├── models/
│   │   ├── user.model.ts               # User data model
│   │   ├── user-session.model.ts       # User session data model
│   │   ├── conversation-message.model.ts  # Message data model (for storage)
│   │   ├── feedback.model.ts           # Feedback data model
│   │   ├── faq.model.ts                # FAQ data model
│   │   ├── password-reset-otp.model.ts # Password reset OTP model
│   │   ├── password-reset-token.model.ts # Password reset token model
│   │   └── settings.model.ts          # Settings model
│   ├── repositories/
│   │   ├── user.repository.ts          # User DB operations
│   │   ├── password-reset-otp.repository.ts  # OTP DB operations
│   │   ├── password-reset-token.repository.ts # Token DB operations
│   │   └── settings.repository.ts      # Settings DB operations
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT authentication & authorization
│   │   └── logging.middleware.ts       # Request logging
│   ├── utils/
│   │   ├── logger.ts                   # Logging utility
│   │   ├── email.util.ts               # Email sending utilities
│   │   ├── phone.util.ts               # Phone number utilities
│   │   └── message.formatter.ts       # Message formatting
│   ├── templates/
│   │   └── email/
│   │       └── otp-email.template.ts  # Email templates
│   ├── types/
│   │   └── aisensy.types.ts            # AI Sensy types
│   ├── scripts/                        # Utility scripts
│   │   ├── create-admin.ts            # Create admin user script
│   │   ├── init-webhook-setting.ts    # Initialize webhook setting
│   │   └── test-smtp.ts               # SMTP test script
│   ├── guardrails/                     # (Future) AI guardrails
│   │   └── ...
│   ├── docs/                           # Documentation
│   ├── tests/                          # Test files
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
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
- Handle message replies (smart context optimization)
- Build optimized conversation history:

  **If Reply:**
    - Find replied-to message in stored history (by `message_id`)
    - Include context window around replied-to message (±3-5 messages)
    - Result: ~7-11 contextually relevant messages
  
  **If New Message:**
    - Include last 8 messages from database
    - Result: ~9 messages (recent context)

- Call AI agent with optimized context (not all 20 messages)
- Handle agent response
- Store messages in database (user message + AI response)
- Auto-cleanup old messages (keep last 20)
- Send response via AI Sensy

**Context Management:**
- **Stored:** Last 20 messages per user in `conversation_messages` collection
- **Purpose:** Better context for OpenAI, AI FAQ suggestions, analytics, debugging
- **Auto-cleanup:** Older messages automatically removed (keep last 20)
- **Why:** Context is critical for natural conversations and AI FAQ suggestions

**Smart Context Optimization:**
- **Reply-based context:** When user replies, find that message in history and include surrounding messages
- **Token efficient:** Send ~7-11 messages instead of all 20 (60-70% token reduction)
- **Contextually relevant:** OpenAI sees conversation thread, not just recent messages
- **Cost effective:** Lower OpenAI API costs

**Reply Handling:**
When a message contains `replied_to_message_id`:
1. Find the replied-to message in stored history (by `message_id`)
2. Include messages around that point (context window: ±3-5 messages)
3. This provides relevant context efficiently without sending all 20 messages
4. Fallback: If replied-to message not found, use last 8 messages

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

## Coding Standards

### Module Structure

All feature modules (auth, users, settings) follow a consistent structure:

```
module-name/
├── controllers/          # HTTP request handlers (one file per endpoint)
├── services/            # Business logic layer
├── routes/              # Route definitions
└── index.ts            # Module exports
```

**Example:**
```
auth/
├── controllers/
│   ├── login.controller.ts
│   ├── logout.controller.ts
│   └── me.controller.ts
├── services/
│   └── auth.service.ts
├── routes/
│   └── auth.routes.ts
└── index.ts
```

### Controller Standards

**1. One File Per Endpoint**
- Each controller file handles exactly one HTTP endpoint
- File naming: `{action}{Resource}.controller.ts`
- Example: `getAllUsers.controller.ts`, `createUser.controller.ts`

**2. Request/Response Documentation**
Every controller file must include comprehensive documentation at the top:

```typescript
/**
 * GET /api/users
 * Get all users (paginated with search and filters)
 * 
 * Headers:
 * Authorization: Bearer <token> (admin only)
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - search: string (optional)
 * 
 * Example Request:
 * GET /api/users?page=1&limit=20&search=admin
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid request"
 * }
 */
```

**3. Controller Function Pattern**
```typescript
export async function controllerName(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validate input
    // 2. Call service
    // 3. Return response
    const result = await service.method();
    
    if (!result.success) {
      res.status(result.statusCode || 500).json({
        success: false,
        error: result.error
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error("Controller error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}
```

### Service Layer Standards

**1. Business Logic Only**
- Services contain business logic, not HTTP concerns
- Services return structured results: `{ success: boolean, data?: T, error?: string, statusCode?: number }`

**2. Service Pattern**
```typescript
export class ServiceName {
  async methodName(params: any): Promise<ServiceResult<DataType>> {
    try {
      // Business logic
      // Call repository
      const data = await repository.method();
      
      return {
        success: true,
        data: this.mapToResponse(data)
      };
    } catch (error) {
      logger.error("Service error", { error });
      return {
        success: false,
        error: "Error message",
        statusCode: 500
      };
    }
  }
  
  private mapToResponse(data: any): ResponseType {
    // Map internal data to response format
  }
}
```

### Repository Layer Standards

**1. Database Operations Only**
- Repositories handle all database interactions
- Use MongoDB collection methods
- Handle ObjectId conversions

**2. Repository Pattern**
```typescript
export class RepositoryName {
  private getCollection() {
    return getDatabase().collection<ModelType>("collection_name");
  }
  
  async findById(id: string): Promise<ModelType | null> {
    try {
      const doc = await this.getCollection().findOne({ 
        _id: toObjectId(id) as any 
      });
      if (!doc) return null;
      
      return {
        ...doc,
        _id: fromObjectId(doc._id as any)
      } as ModelType;
    } catch (error) {
      logger.error("Repository error", { error });
      return null;
    }
  }
}
```

### Route Standards

**1. Route Organization**
- Routes defined in `routes/{module}.routes.ts`
- Use Express Router
- Apply middleware at route level

**2. Route Pattern**
```typescript
import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";
import { controllerFunction } from "../controllers/controller.controller.js";

const router = Router();

// Apply middleware
router.use(authenticate);
router.use(requireAdmin); // If admin-only

// Define routes
router.get("/", controllerFunction);
router.get("/:id", getByIdController);
router.post("/", createController);

export default router;
```

### Response Format Standards

**All API responses follow this structure:**

**Success Response:**
```typescript
{
  "success": true,
  "data": { ... },           // Response data
  "message"?: string         // Optional success message
}
```

**Error Response:**
```typescript
{
  "success": false,
  "error": "Error message"  // Human-readable error message
}
```

**Pagination Response:**
```typescript
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### Error Handling Standards

**1. Service Layer**
- Services return `{ success: false, error: string, statusCode?: number }`
- Never throw errors (except for unexpected errors)
- Log all errors with context

**2. Controller Layer**
- Always use try-catch
- Return appropriate HTTP status codes
- Never expose internal error details to clients
- Log errors with full context

**3. Error Status Codes**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Authentication & Authorization

**1. Middleware Usage**
```typescript
// Require authentication
router.use(authenticate);

// Require admin role
router.use(requireAdmin);

// Require admin or customer support
router.use(requireAdminOrSupport);
```

**2. Accessing User in Controllers**
```typescript
const userId = (req as any).user?._id;
const userRole = (req as any).user?.role;
```

### Model Standards

**1. Type Definitions**
- Define interfaces in `models/` directory
- Include DTOs (Data Transfer Objects) for create/update operations
- Include Response types (without sensitive fields)

**2. Model Pattern**
```typescript
export interface ModelName {
  _id?: string;
  field1: string;
  field2: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateModelDto {
  field1: string;
  field2: number;
}

export interface UpdateModelDto {
  field1?: string;
  field2?: number;
}

export interface ModelResponse {
  _id: string;
  field1: string;
  field2: number;
  created_at: Date;
  updated_at: Date;
}
```

### Logging Standards

**1. Use Structured Logging**
```typescript
logger.info("Action description", { context });
logger.error("Error description", { error, context });
logger.warn("Warning description", { context });
```

**2. Log Levels**
- `info` - Normal operations, successful requests
- `warn` - Warning conditions, non-critical issues
- `error` - Error conditions, failures

### Import Standards

**1. Import Order**
1. External dependencies
2. Internal modules (config, utils, middleware)
3. Local modules (models, repositories, services)
4. Types

**2. Import Pattern**
```typescript
// External
import express from "express";
import type { Request, Response } from "express";

// Internal
import { logger } from "../../utils/logger.js";
import { authenticate } from "../../middleware/auth.middleware.js";

// Local
import { userService } from "../services/user.service.js";
import type { UserResponse } from "../../models/user.model.js";
```

### TypeScript Standards

**1. Strict Type Safety**
- Use TypeScript strict mode
- Define types for all data structures
- Use `type` for unions, `interface` for objects
- Avoid `any` - use `unknown` if type is truly unknown

**2. Optional Properties**
- Use `exactOptionalPropertyTypes: true` in tsconfig
- Conditionally include optional properties:
```typescript
{
  ...data,
  ...(optionalField && { optionalField })
}
```

### Script Standards

**1. Executable Scripts**
- Use shebang: `#!/usr/bin/env tsx`
- Make executable: `chmod +x scripts/script-name.ts`
- Include usage documentation in comments

**2. Script Pattern**
```typescript
#!/usr/bin/env tsx

/**
 * Script Description
 * 
 * Usage:
 *   npx tsx scripts/script-name.ts
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";

dotenv.config();

async function main() {
  try {
    await connectDatabase();
    // Script logic
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

main();
```

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

