# Sundus AI - Tools Reference

## Overview

This document lists all tools/functions that the AI agent can call. Each tool is defined with its purpose, parameters, and when the AI should use it.

**Important:** Sending WhatsApp messages is **NOT** an AI tool. It's handled automatically by our backend after the AI generates a response. See "Message Sending" section below.

---

## Complete Tool List

### 1. Product Tools

#### `search_products`
**Purpose:** Search for products by SKU, brand name, or keywords

**When to use:**
- User wants to find products
- User searches for items
- User browses catalog
- User asks about specific brands
- User wants product recommendations

**Parameters:**
```typescript
{
  query: string  // Search query - brand name, SKU, or keywords
}
```

**Returns:** Array of products with details

---

#### `get_product_details`
**Purpose:** Get detailed information about a specific product

**When to use:**
- User asks about a specific product
- User wants full product information
- User clicks on a product from search results

**Parameters:**
```typescript
{
  product_id: number  // Product ID
}
```

**Returns:** Full product details (images, price, description, etc.)

---

#### `list_brands`
**Purpose:** Get list of all available brands

**When to use:**
- User asks "what brands do you have?"
- User wants to see all brands
- User asks about brand options

**Parameters:**
```typescript
{}  // No parameters needed
```

**Returns:** Array of brands with names and logos

---

### 2. Order Tracking Tools

#### `track_order`
**Purpose:** Start the order tracking process (initiates OTP authentication if needed)

**When to use:**
- User wants to track their order
- User asks about order status
- User wants to check delivery status
- User asks "where is my order?"

**Parameters:**
```typescript
{
  order_id: string,      // Order ID (e.g., "6317" or "#6317")
  phone_number: string   // User's phone number for authentication
}
```

**Returns:** 
- If not authenticated: Initiates OTP flow
- If authenticated: Returns order details

**Note:** This tool handles the OTP flow automatically if user is not authenticated.

---

#### `verify_otp`
**Purpose:** Verify OTP code for order tracking authentication

**When to use:**
- User provides OTP code during order tracking
- OTP verification is needed

**Parameters:**
```typescript
{
  phone_number: string,  // User's phone number
  otp_code: string       // OTP code received by user
}
```

**Returns:** Authentication token and user details

---

#### `get_order_details`
**Purpose:** Get detailed information about a specific order (requires authentication)

**When to use:**
- User is authenticated and wants order details
- After OTP verification
- User asks for specific order information

**Parameters:**
```typescript
{
  order_id: string,  // Order ID (e.g., "6317" or "#6317")
  token: string      // Authentication token (from verify_otp)
}
```

**Returns:** Full order details (status, items, billing, payment, etc.)

---

#### `list_orders`
**Purpose:** Get list of all orders for authenticated user

**When to use:**
- User asks "show me all my orders"
- User wants order history
- User asks "what orders do I have?"

**Parameters:**
```typescript
{
  token: string  // Authentication token
}
```

**Returns:** Array of user's orders

---

### 3. FAQ Tools

#### `search_faqs`
**Purpose:** Search the FAQ database for answers to common questions

**When to use:**
- User asks about policies (return, shipping, etc.)
- User asks general questions
- User wants information about procedures
- User asks "how do I...?" questions

**Parameters:**
```typescript
{
  query: string  // User's question or query
}
```

**Returns:** 
- FAQ answer if similarity > threshold
- null if no relevant FAQ found (AI will generate response)

---

### 4. Feedback Tools (Optional - for tracking)

#### `record_feedback`
**Purpose:** Record user feedback on bot responses

**When to use:**
- User clicks "Yes" or "No" on feedback prompt
- Track feedback for analytics

**Parameters:**
```typescript
{
  message_id: string,  // ID of message being rated
  feedback: "yes" | "no"  // User feedback
}
```

**Returns:** Confirmation

**Note:** This might be handled automatically by the feedback system, not as an AI tool.

---

## Tool Definitions (TypeScript)

### Complete Tool Array

```typescript
export const tools = [
  // Product Tools
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search for products in the catalog by SKU, brand name, or keywords. Use this when user wants to: find products, search for items, browse catalog, look for specific brands (e.g., Nike, Aston Martin), search by SKU code, or get product recommendations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - can be brand name (e.g., 'Nike', 'Aston Martin'), SKU code (e.g., 'MTTS2F504'), or product keywords (e.g., 'watches', 'silver watch')"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a specific product including images, price, description, stock status, and product link. Use this when user asks about a specific product, wants full product information, or clicks on a product from search results.",
      parameters: {
        type: "object",
        properties: {
          product_id: {
            type: "number",
            description: "Product ID number"
          }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_brands",
      description: "Get list of all available brands in the catalog. Use this when user asks 'what brands do you have?', wants to see all brands, or asks about brand options.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  
  // Order Tracking Tools
  {
    type: "function",
    function: {
      name: "track_order",
      description: "Start the order tracking process. Use this when user wants to: track their order, check order status, see order details, find out delivery status, or check where their order is. This will automatically initiate OTP authentication if user is not already authenticated.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Order ID in format '#6317' or '6317'"
          },
          phone_number: {
            type: "string",
            description: "User's phone number for authentication (without country code prefix, e.g., '560916906')"
          }
        },
        required: ["order_id", "phone_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "verify_otp",
      description: "Verify OTP code for order tracking authentication. Use this when user provides OTP code during order tracking flow.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "User's phone number"
          },
          otp_code: {
            type: "string",
            description: "OTP code received by user (4-6 digits)"
          }
        },
        required: ["phone_number", "otp_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Get detailed information about a specific order including status, items, billing details, and payment information. Requires user authentication. Use this after OTP verification or when user is already authenticated and asks for specific order information.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Order ID in format '#6317' or '6317'"
          },
          token: {
            type: "string",
            description: "Authentication token obtained from verify_otp"
          }
        },
        required: ["order_id", "token"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "Get list of all orders for the authenticated user. Use this when user asks 'show me all my orders', wants order history, or asks 'what orders do I have?'. Requires authentication.",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Authentication token obtained from verify_otp"
          }
        },
        required: ["token"]
      }
    }
  },
  
  // FAQ Tools
  {
    type: "function",
    function: {
      name: "search_faqs",
      description: "Search the FAQ database for answers to common questions. Use this when user asks about: return policy, shipping, delivery, payment methods, warranty, product information, or general questions about the business. This searches a vector database of FAQs for the most relevant answer.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The user's question or query about policies, procedures, or general information"
          }
        },
        required: ["query"]
      }
    }
  }
];
```

---

## Message Sending (NOT a Tool)

**Important:** Sending WhatsApp messages is **NOT** an AI tool. Here's why:

### How Message Sending Works

1. **AI Generates Response**
   - AI calls tools to get data (products, orders, FAQs)
   - AI formats response with the data
   - AI returns text response

2. **Our Backend Sends Message**
   - After AI generates response, our backend automatically:
     - Formats the message
     - Adds feedback prompt ("Was this helpful?")
     - Sends via AI Sensy API
     - Handles media/images if needed

### Why It's Not a Tool

- ❌ **AI doesn't decide when to send messages** - we send after every AI response
- ❌ **Not part of AI's decision-making** - it's our orchestration
- ✅ **Automatic process** - happens after AI generates response
- ✅ **Backend responsibility** - not AI's job

### Flow

```
User Message
  ↓
AI Processes (may call tools)
  ↓
AI Generates Response Text
  ↓
Our Backend:
  - Formats response
  - Adds feedback prompt
  - Sends via AI Sensy API ← This is NOT an AI tool!
  ↓
User Receives Message
```

### Special Cases

**OTP Sending:**
- When `track_order` tool is called and user needs OTP
- Our backend automatically sends OTP via WhatsApp
- This is handled in the tool executor, not as a separate tool

**Media Messages:**
- When product search returns images
- Our backend automatically sends images via WhatsApp
- This is handled in response formatting, not as a tool

---

## Tool Categories Summary

| Category | Tools | Purpose |
|----------|-------|---------|
| **Products** | `search_products`, `get_product_details`, `list_brands` | Product search and browsing |
| **Orders** | `track_order`, `verify_otp`, `get_order_details`, `list_orders` | Order tracking and management |
| **FAQs** | `search_faqs` | Answer common questions |

**Total: 8 Tools**

---

## Tool Execution Flow

### Product Search Flow
```
User: "Show me Nike watches"
  ↓
AI calls: search_products("Nike watches")
  ↓
Returns: Array of products
  ↓
AI formats: "I found 5 Nike watches: ..."
```

### Order Tracking Flow
```
User: "Track order #6317"
  ↓
AI calls: track_order(order_id="#6317", phone_number="...")
  ↓
If not authenticated:
  - Sends OTP to user
  - User provides OTP
  - AI calls: verify_otp(phone_number, otp_code)
  - Gets token
  ↓
AI calls: get_order_details(order_id="#6317", token="...")
  ↓
Returns: Order details
  ↓
AI formats: "Your order #6317 is completed..."
```

### FAQ Flow
```
User: "What's your return policy?"
  ↓
AI calls: search_faqs("return policy")
  ↓
If FAQ found (similarity > 0.85):
  Returns: FAQ answer
  AI formats: "According to our return policy: ..."
Else:
  Returns: null
  AI generates general response
```

---

## Implementation Notes

### Tool Organization

```
src/agent/tools/
├── index.ts              # Exports all tools
├── product.tools.ts      # Product tools (3)
├── order.tools.ts        # Order tools (4)
└── faq.tools.ts          # FAQ tools (1)
```

### Tool Executors

```
src/agent/executor/
├── index.ts              # Routes tool calls
├── product.executor.ts   # Executes product tools
├── order.executor.ts     # Executes order tools
└── faq.executor.ts       # Executes FAQ tools
```

### Tool Services

```
src/services/
├── product.service.ts    # Product business logic
├── order.service.ts      # Order business logic
└── faq.service.ts        # FAQ business logic
```

---

## Adding New Tools

### Step 1: Define Tool
```typescript
// agent/tools/newfeature.tools.ts
export const newFeatureTool = {
  type: "function",
  function: {
    name: "new_feature_action",
    description: "Clear description of what this does and when to use it",
    parameters: { /* ... */ }
  }
};
```

### Step 2: Add to Tool Registry
```typescript
// agent/tools/index.ts
export * from './newfeature.tools';
// Add to tools array
```

### Step 3: Create Executor
```typescript
// agent/executor/newfeature.executor.ts
export async function executeNewFeatureTool(toolName: string, args: any) {
  // Execute tool logic
}
```

### Step 4: Register Executor
```typescript
// agent/executor/index.ts
// Add to executor router
```

---

## Tool Validation

All tools must:
- ✅ Have clear, descriptive `description` field
- ✅ Include use cases in description
- ✅ Have well-defined parameters
- ✅ Include parameter descriptions
- ✅ Handle errors gracefully
- ✅ Return structured data

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

