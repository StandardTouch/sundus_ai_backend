# Tool Design Guide - How AI Knows Which Tool to Call

## Overview

**Critical Understanding:** OpenAI's function calling intelligently selects tools based on **tool descriptions**, NOT explicit prompts. The AI reads the `description` field of each tool and matches it to user intent automatically.

---

## How It Works

### The Magic: Tool Descriptions

When you define a tool, the `description` field is what the AI reads to understand:
1. **What the tool does**
2. **When to use it**
3. **What parameters it needs**

**Example:**

```typescript
{
  type: "function",
  function: {
    name: "search_products",
    description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, or look for specific items.",
    // ↑ This is what AI reads to decide when to call this tool!
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query - can be brand name (e.g., 'Nike'), SKU code, or product keywords"
        }
      },
      required: ["query"]
    }
  }
}
```

**When user says:**
- "Show me Nike watches" → AI matches to `search_products` description → Calls it!
- "Find products" → AI matches to `search_products` description → Calls it!
- "Search for ABC123" → AI matches to `search_products` description → Calls it!

**No explicit instruction needed!**

---

## Best Practices for Tool Descriptions

### ✅ DO: Write Clear, Descriptive Tool Descriptions

```typescript
{
  name: "track_order",
  description: "Track the status of an order. Use this when user wants to check order status, track delivery, see order details, or find out where their order is. Requires order ID and user authentication via OTP.",
  // Clear: What it does, when to use it, what it needs
}
```

### ❌ DON'T: Write Vague Descriptions

```typescript
{
  name: "track_order",
  description: "Track order",
  // Too vague! AI won't know when to use it
}
```

### ✅ DO: Include Use Cases in Description

```typescript
{
  name: "search_products",
  description: "Search for products by SKU, brand, or keywords. Use this when user: wants to find products, searches for items, browses catalog, looks for specific brands, asks about product availability, or wants product recommendations.",
}
```

### ✅ DO: Describe Parameters Clearly

```typescript
parameters: {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query - can be brand name (e.g., 'Nike', 'Aston Martin'), SKU code (e.g., 'MTTS2F504'), or product keywords (e.g., 'watches', 'silver watch')"
      // Clear examples help AI understand what to pass
    }
  }
}
```

---

## Real Examples

### Example 1: Product Search Tool

```typescript
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
          description: "Search query - can be brand name, SKU code, or product keywords. Examples: 'Nike watches', 'MTTS2F504', 'silver watch'"
        }
      },
      required: ["query"]
    }
  }
}
```

**User Variations That Trigger This Tool:**
- "Show me Nike watches" ✅
- "Find products" ✅
- "Search for ABC123" ✅
- "I'm looking for watches" ✅
- "What products do you have?" ✅
- "Browse catalog" ✅

**AI automatically matches all of these to the tool!**

---

### Example 2: Order Tracking Tool

```typescript
{
  type: "function",
  function: {
    name: "track_order",
    description: "Start the order tracking process. Use this when user wants to: track their order, check order status, see order details, find out delivery status, or check where their order is. This will initiate OTP authentication if user is not already authenticated.",
    parameters: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "Order ID in format '#6317' or '6317'"
        },
        phone_number: {
          type: "string",
          description: "User's phone number for authentication"
        }
      },
      required: ["order_id", "phone_number"]
    }
  }
}
```

**User Variations That Trigger This Tool:**
- "Track my order" ✅
- "Where is my order?" ✅
- "Check order status" ✅
- "I want to track order #6317" ✅
- "Show me my order details" ✅

---

### Example 3: FAQ Search Tool

```typescript
{
  type: "function",
  function: {
    name: "search_faqs",
    description: "Search the FAQ database for answers to common questions. Use this when user asks about: return policy, shipping, delivery, payment, warranty, product information, or general questions about the business. This searches a vector database of FAQs for the most relevant answer.",
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
```

**User Variations That Trigger This Tool:**
- "What's your return policy?" ✅
- "How do I return an item?" ✅
- "Tell me about shipping" ✅
- "What's the warranty?" ✅

---

## What You DON'T Need

### ❌ NO Explicit Routing Instructions

```typescript
// ❌ DON'T DO THIS:
system: "If user says 'track order', call track_order tool"
system: "If user says 'search', call search_products tool"
system: "If user asks a question, call search_faqs tool"

// ✅ AI figures it out from tool descriptions!
```

### ❌ NO Hardcoded Intent Detection

```typescript
// ❌ DON'T DO THIS:
if (message.includes("track") || message.includes("order")) {
  callTrackOrder();
}
if (message.includes("search") || message.includes("find")) {
  callSearchProducts();
}

// ✅ AI does this automatically from descriptions!
```

### ❌ NO Complex Prompt Engineering

```typescript
// ❌ DON'T DO THIS:
system: "You are an assistant. When user wants to track order, use track_order tool. When user wants to search, use search_products tool..."

// ✅ Just define tools with good descriptions!
```

---

## System Prompt Best Practices

### ✅ DO: Keep System Prompt Simple

```typescript
system: "You are Sundus AI, a helpful assistant for Alhomaidhi Group. You help customers with product searches, order tracking, and FAQs. Respond in the user's preferred language (English or Arabic). Be friendly and professional."
```

### ✅ DO: Let Tool Descriptions Do the Work

The tool descriptions tell AI:
- What each tool does
- When to use each tool
- What parameters are needed

**No need to repeat this in system prompt!**

---

## Testing Tool Selection

### How to Verify AI Selects Correct Tools

1. **Test with Natural Language**
   ```
   User: "Show me Nike watches"
   Expected: AI calls search_products("Nike watches")
   ```

2. **Test Variations**
   ```
   User: "Find products"
   User: "I'm looking for watches"
   User: "Search for Nike"
   Expected: All trigger search_products tool
   ```

3. **Test Context Awareness**
   ```
   User: "Track my order"
   AI: "What's your order number?"
   User: "#6317"
   Expected: AI calls get_order_details("6317")
   ```

---

## Common Mistakes

### ❌ Mistake 1: Vague Descriptions

```typescript
// ❌ Bad
description: "Search products"

// ✅ Good
description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, or look for specific brands."
```

### ❌ Mistake 2: Missing Use Cases

```typescript
// ❌ Bad
description: "Track order status"

// ✅ Good
description: "Track the status of an order. Use this when user wants to check order status, track delivery, see order details, or find out where their order is."
```

### ❌ Mistake 3: Unclear Parameters

```typescript
// ❌ Bad
query: {
  type: "string",
  description: "Query"
}

// ✅ Good
query: {
  type: "string",
  description: "Search query - can be brand name (e.g., 'Nike'), SKU code (e.g., 'MTTS2F504'), or product keywords (e.g., 'watches')"
}
```

---

## Summary

**Key Takeaways:**

1. ✅ **AI intelligently selects tools** from descriptions
2. ✅ **No extra prompts needed** for routing
3. ✅ **Tool descriptions are instructions** - write them well!
4. ✅ **Include use cases** in descriptions
5. ✅ **Clear parameter descriptions** help AI pass correct values
6. ✅ **Test with natural language** variations

**The AI reads tool descriptions and matches them to user intent automatically. That's the magic of OpenAI Function Calling!**

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

