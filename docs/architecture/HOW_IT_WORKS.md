# How Sundus AI Works

## Overview

Sundus AI is **NOT an MCP (Model Context Protocol) server**. Instead, it's a **backend server** that uses **OpenAI's Function Calling** feature to create an intelligent WhatsApp chatbot.

---

## Architecture Type

### What We're Building

**OpenAI Function Calling / Tool Use Architecture**

- Backend server (Express.js/Node.js)
- Receives webhooks from AI Sensy (WhatsApp messages)
- Uses OpenAI's function calling feature
- AI decides when to call tools
- We execute tools and return results to AI
- AI formats response and sends via WhatsApp

### What We're NOT Building

- ❌ MCP (Model Context Protocol) server
- ❌ LangChain agent
- ❌ Custom LLM
- ❌ Standalone AI model

---

## How It Works: Step-by-Step

### 1. User Sends Message via WhatsApp

```
User types: "Show me Nike watches"
    ↓
WhatsApp → AI Sensy Platform
    ↓
AI Sensy sends webhook to our server
```

### 2. Our Server Receives Webhook

```typescript
// webhook.handler.ts
POST /webhook
{
  "data": {
    "message": {
      "message_type": "TEXT",
      "message_content": { "text": "Show me Nike watches" },
      "phone_number": "917676079163"
    }
  }
}
```

### 3. Load Conversation Context & Handle Replies (Smart Optimization)

```typescript
// message.handler.ts
- Load user session from database (token, feedback count, language)
- Load recent messages from database (last 20 messages per user)
- Check if message is a reply (has replied_to_message_id)
- Build optimized conversation history:

  IF reply (has replied_to_message_id):
    - Find replied-to message in stored history
    - Include messages around replied-to message (context window: ±3-5 messages)
    - Include replied-to message
    - Include messages after replied-to message (if any)
    - Add current user message
    → Result: ~7-11 contextually relevant messages
  
  ELSE (new message, no reply):
    - Include last 8 messages from database
    - Add current user message
    → Result: ~9 messages (recent context)

- Prepare message history for OpenAI
- Get user's language preference
- Check authentication status
```

**Important: Context Management & Token Optimization**

We store the **last 20 messages per user** in the database for:
- ✅ **Better context** - OpenAI gets full conversation history
- ✅ **AI FAQ suggestions** - Analyze conversations to suggest FAQs
- ✅ **Reply handling** - Cache original messages
- ✅ **Analytics** - Track conversation patterns
- ✅ **Auto-cleanup** - Older messages automatically removed (keep last 20)

**Smart Context Optimization:**
- ✅ **Reply-based context** - When user replies, include messages around replied-to message (not just last N)
- ✅ **Token efficient** - Send ~7-11 messages instead of all 20 (60-70% token reduction)
- ✅ **Contextually relevant** - OpenAI sees the conversation thread, not just recent messages
- ✅ **Adaptive** - Adjusts based on whether it's a reply or new message

**Important: Reply Context Handling**

When a user replies to a message, the webhook contains `replied_to_message_id`. We handle this in the backend:

```typescript
// If user is replying to a message
if (replied_to_message_id) {
  // Fetch original message (backend code, not AI tool)
  const originalMessage = await aisensyService.getMessageDetails(replied_to_message_id);
  
  // Add to conversation history so AI has context
  conversationHistory.push({
    role: "assistant",
    content: originalMessage.message_content.text
  });
}
```

**Why backend handling?**
- ✅ Faster - No extra AI tool call needed
- ✅ More reliable - Context always available
- ✅ Simpler - AI doesn't need to decide
- ✅ Better UX - Immediate context understanding

**See:** [Message Reply Handling](../development/MESSAGE_REPLY_HANDLING.md) for complete details.

### 4. Call OpenAI with Tools Available

```typescript
// agent/index.ts
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "You are Sundus AI, a helpful assistant for Alhomaidhi Group. You help customers with product searches, order tracking, and FAQs. Respond in the user's preferred language (English or Arabic)."
      // ✅ NO explicit instructions about when to call tools!
      // ✅ AI figures it out from tool descriptions!
    },
    ...conversationHistory,
    {
      role: "user",
      content: "Show me Nike watches"
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "search_products",
        description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, or browse catalog.",
        // ✅ The description tells AI WHEN to use this tool!
        parameters: {
          type: "object",
          properties: {
            query: { 
              type: "string",
              description: "Search query - can be brand name (e.g., 'Nike'), SKU, or product keywords"
            }
          },
          required: ["query"]
        }
      }
    },
    // ... other tools
  ],
  tool_choice: "auto" // ✅ AI intelligently decides when to use tools!
});
```

**Key Point:** 
- ✅ **NO extra prompts needed** to tell AI when to call tools
- ✅ AI **intelligently understands** from tool descriptions
- ✅ Tool `description` field is what AI reads to decide
- ✅ AI matches user intent to tool descriptions automatically

### 5. AI Decides: Call Tool or Respond Directly

**Scenario A: AI Decides to Call Tool**
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "search_products",
        "arguments": "{\"query\": \"Nike watches\"}"
      }
    }
  ]
}
```

**Scenario B: AI Responds Directly**
```json
{
  "role": "assistant",
  "content": "Hello! How can I help you today?"
}
```

### 6. If Tool Called: Execute Tool

```typescript
// agent/executor/product.executor.ts
if (toolCall.function.name === "search_products") {
  const args = JSON.parse(toolCall.function.arguments);
  
  // Execute tool
  const products = await productService.search(args.query);
  
  // Return result to OpenAI
  return {
    tool_call_id: toolCall.id,
    role: "tool",
    content: JSON.stringify(products)
  };
}
```

### 7. Tool Execution Flow

```
Tool Call: search_products("Nike watches")
    ↓
agent/executor/product.executor.ts
    ↓
services/product.service.ts
    ↓
api/alhomaidhi/product.api.ts
    ↓
HTTP Request: GET /list_products?search=Nike watches
    ↓
Alhomaidhi API returns products
    ↓
Result flows back: API → Service → Executor
    ↓
Return to OpenAI as tool result
```

### 8. OpenAI Formats Final Response

```typescript
// OpenAI receives tool result
// AI formats response with product data
{
  "role": "assistant",
  "content": "I found 5 Nike watches:\n\n1. Nike Watch Model X - $299\n2. Nike Watch Model Y - $399\n..."
}
```

### 9. Store Message & Send Response via WhatsApp

```typescript
// message.handler.ts
// This is NOT an AI tool - it's our backend's responsibility!

- Store user message in database (conversation_messages collection)
- Store AI response in database (conversation_messages collection)
- Auto-cleanup old messages (keep last 20 per user)
- Format AI response
- Add feedback prompt: "Was this helpful? Yes/No"
- Send via AI Sensy API (aisensy.service.ts)
- Handle media/images if needed
```

**Message Storage:**
- ✅ Store both user messages and AI responses
- ✅ Keep last 20 messages per user
- ✅ Auto-cleanup older messages
- ✅ Used for context, AI FAQ suggestions, and analytics

**Important:** 
- ❌ Sending WhatsApp messages is **NOT** an AI tool
- ✅ It's our backend's automatic process after AI generates response
- ✅ AI just generates text - we handle sending

### 10. User Receives Message

```
WhatsApp ← AI Sensy ← Our Server
    ↓
User sees: "I found 5 Nike watches: ..."
           "Was this helpful? [Yes] [No]"
```

---

## Key Differences: Function Calling vs MCP

### OpenAI Function Calling (What We're Using)

```
┌─────────────┐
│   OpenAI    │
│   (GPT-4)   │
└──────┬──────┘
       │ Function Call Request
       ▼
┌─────────────┐
│ Our Server  │
│ (Executor)  │
└──────┬──────┘
       │ Execute Tool
       ▼
┌─────────────┐
│   APIs/DB   │
└─────────────┘
       │
       ▼ Result
┌─────────────┐
│   OpenAI    │
│ Formats     │
└─────────────┘
```

**Characteristics:**
- ✅ OpenAI decides when to call functions
- ✅ Functions defined in OpenAI API call
- ✅ Results returned to OpenAI
- ✅ OpenAI formats final response
- ✅ All orchestrated by our backend

### MCP (Model Context Protocol) - What We're NOT Using

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ MCP Protocol
       ▼
┌─────────────┐
│ MCP Server  │
│ (Separate)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Tools     │
└─────────────┘
```

**Characteristics:**
- ❌ Separate MCP server
- ❌ Standardized MCP protocol
- ❌ Used by MCP-compatible clients
- ❌ Not what we're building

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    WhatsApp User                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Sensy Platform                      │
│              (WhatsApp Business API)                     │
└────────────────────┬────────────────────────────────────┘
                     │ Webhook (POST)
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Sundus AI Backend Server                     │
│                                                          │
│  1. webhook.handler.ts                                  │
│     - Parse webhook payload                             │
│     - Extract message                                   │
│                                                          │
│  2. Guardrails                                          │
│     - Input validation                                 │
│     - Content moderation                               │
│     - Rate limiting                                    │
│                                                          │
│  3. message.handler.ts                                  │
│     - Load conversation context                         │
│     - Prepare message history                           │
│                                                          │
│  4. agent/index.ts                                      │
│     - Call OpenAI with:                                │
│       • Conversation history                            │
│       • Available tools (functions)                    │
│                                                          │
│  5. OpenAI Decides:                                     │
│     • Call tool? → Execute tool → Return to OpenAI     │
│     • Respond directly? → Format response              │
│                                                          │
│  6. Tool Execution (if called):                         │
│     agent/executor/ → services/ → api/ → External API  │
│                                                          │
│  7. OpenAI Formats Response                             │
│     (with tool results if any)                          │
│                                                          │
│  8. Guardrails                                          │
│     - Output filtering                                 │
│     - Response validation                              │
│                                                          │
│  9. message.handler.ts                                  │
│     - Add feedback prompt                               │
│     - Send via AI Sensy API                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Sensy Platform                      │
│              (Send Message API)                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    WhatsApp User                         │
│              (Receives Response)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

1. **Backend Framework:** Express.js (Node.js/TypeScript)
2. **AI/LLM:** OpenAI GPT-4 (with Function Calling)
3. **WhatsApp Integration:** AI Sensy API
4. **External APIs:** Alhomaidhi Group API
5. **Database:** MongoDB (user sessions, feedback, FAQ metadata)
6. **Vector DB:** Pinecone (for FAQs)

### OpenAI Function Calling

**What it is:**
- Feature of OpenAI's Chat Completions API
- Allows AI to call functions/tools we define
- AI decides when to call tools based on user intent
- Results returned to AI for formatting

**How we use it:**
```typescript
// Define tools
const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "...",
      parameters: { ... }
    }
  }
];

// Call OpenAI
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
  tools: tools,
  tool_choice: "auto" // AI decides
});

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  // Execute tools
  // Return results to OpenAI
}
```

---

## How AI Knows Which Tool to Call

### ✅ Intelligent Tool Selection (No Extra Prompts Needed!)

**The Magic:** OpenAI's function calling uses the tool `description` field to intelligently match user intent to tools.

**Example:**

```typescript
// Tool definition
{
  name: "search_products",
  description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, or browse catalog.",
  // ↑ This description is what AI reads!
}

// User says: "Show me Nike watches"
// AI thinks: "User wants to find products → matches search_products description → I'll call it!"
// ✅ No explicit instruction needed!
```

**How It Works:**

1. **Tool Descriptions = Instructions**
   - The `description` field tells AI when to use the tool
   - AI reads descriptions and matches to user intent
   - No need for "if user says X, call Y" logic

2. **Natural Language Understanding**
   - AI understands variations:
     - "Show me Nike watches" → `search_products("Nike watches")`
     - "Find products with SKU ABC123" → `search_products("ABC123")`
     - "I'm looking for watches" → `search_products("watches")`

3. **Context Awareness**
   - AI considers conversation history
   - Understands follow-up questions
   - Handles ambiguous requests intelligently

**Example Conversation:**

```
User: "I want to track my order"
AI: [Reads tool descriptions]
    [Sees track_order description: "Track order status..."]
    [Matches user intent → Calls track_order]
    "I'll help you track your order. What's your order number?"

User: "#6317"
AI: [Knows from context this is order tracking flow]
    [Calls get_order_details with order_id="6317"]
    "Your order #6317 is completed..."
```

**What We DON'T Need:**

```typescript
// ❌ NO need for this:
system: "If user says 'track order', call track_order tool"
system: "If user says 'search', call search_products tool"
system: "If user says 'FAQ', call search_faqs tool"

// ✅ AI figures it out from tool descriptions!
```

## Why This Architecture?

### Advantages

1. **Natural Conversations**
   - Users don't need specific commands
   - AI understands intent naturally
   - Handles context and follow-ups

2. **Intelligent Tool Selection (Automatic!)**
   - ✅ AI decides best tool from descriptions
   - ✅ No hardcoded routing logic needed
   - ✅ Can combine multiple tools
   - ✅ Handles edge cases intelligently

3. **Flexible & Extensible**
   - Easy to add new tools (just add description)
   - No code changes for routing
   - AI adapts to new capabilities automatically

4. **Better User Experience**
   - Conversational interface
   - Context-aware responses
   - Handles ambiguity

### Example: Natural Conversation (AI Figures It Out!)

```
User: "I want to track my order"
AI: [Reads tool descriptions]
    [Matches "track order" to track_order tool description]
    [Calls track_order tool automatically]
    "I'll help you track your order. What's your order number?"

User: "#6317"
AI: [Knows from context: we're in order tracking flow]
    [Calls get_order_details tool]
    "Your order #6317 is completed and was delivered on..."

User: "Thanks! Can you show me similar products?"
AI: [Understands "similar products" = product search]
    [Matches to search_products tool description]
    [Calls search_products tool]
    "Here are similar products you might like..."
```

**Key Point:** AI figures out which tool to call from:
- ✅ Tool descriptions (what each tool does)
- ✅ User's message (what they want)
- ✅ Conversation context (where we are in the flow)

**No explicit instructions needed!**

---

## Comparison Table

| Aspect | Our System | MCP Server |
|--------|-----------|------------|
| **Type** | Backend Server | Protocol Server |
| **AI Integration** | OpenAI Function Calling | MCP Protocol |
| **Tool Execution** | Our backend executes | MCP server executes |
| **Response Formatting** | OpenAI formats | Client formats |
| **Orchestration** | Our server orchestrates | MCP client orchestrates |
| **Use Case** | WhatsApp chatbot | General AI tool access |

---

## Summary

**What We're Building:**
- ✅ Backend server using OpenAI Function Calling
- ✅ AI agent that decides when to call tools
- ✅ Tool execution layer in our backend
- ✅ WhatsApp chatbot integration

**What We're NOT Building:**
- ❌ MCP (Model Context Protocol) server
- ❌ Standalone AI model
- ❌ LangChain agent

**How It Works:**
1. User sends WhatsApp message
2. Our server receives webhook
3. We call OpenAI with available tools
4. AI decides: call tool or respond directly
5. If tool called: we execute it
6. Results returned to AI
7. AI formats response
8. We send response via WhatsApp

This is a **standard OpenAI Function Calling implementation** for a WhatsApp chatbot, not an MCP server.

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

