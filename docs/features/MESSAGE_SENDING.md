# Message Sending Architecture

## Overview

**Key Point:** Sending WhatsApp messages is **NOT** an AI tool. It's handled automatically by our backend after the AI generates a response.

---

## How Message Sending Works

### Standard Flow

```
1. User sends message via WhatsApp
   ↓
2. AI processes message (may call tools)
   ↓
3. AI generates response text
   ↓
4. Our Backend (message.handler.ts):
   - Receives AI response
   - Formats message
   - Adds feedback prompt
   - Sends via AI Sensy API ← Automatic, not an AI tool!
   ↓
5. User receives message
```

### Why It's Not an AI Tool

**AI Tools are for:**
- ✅ Getting data (products, orders, FAQs)
- ✅ Performing actions (search, track, verify)
- ✅ Returning information to AI

**Message Sending is:**
- ❌ Not data retrieval
- ❌ Not an action the AI decides
- ✅ Our backend's orchestration responsibility
- ✅ Automatic after every AI response

---

## Message Sending Implementation

### Location: `src/services/aisensy.service.ts`

```typescript
// aisensy.service.ts
export class AISensyService {
  /**
   * Send text message via WhatsApp
   * Called automatically by message handler after AI generates response
   */
  async sendTextMessage(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    // Call AI Sensy API to send message
    await axios.post(AISENSY_API_URL, {
      phone_number: phoneNumber,
      message: message
    });
  }

  /**
   * Send message with feedback prompt
   * Automatically adds "Was this helpful? Yes/No" buttons
   */
  async sendMessageWithFeedback(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    // Send main message
    await this.sendTextMessage(phoneNumber, message);
    
    // Send feedback prompt with quick replies
    await this.sendQuickReply(
      phoneNumber,
      "Was this helpful?",
      ["Yes", "No"]
    );
  }

  /**
   * Send image/media message
   * Used when product search returns images
   */
  async sendImageMessage(
    phoneNumber: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    // Send image via AI Sensy API
  }
}
```

### Usage in Message Handler

```typescript
// message.handler.ts
async function handleMessage(webhookPayload: WebhookPayload) {
  // 1. Process with AI (may call tools)
  const aiResponse = await agent.processMessage(userMessage);
  
  // 2. Format response
  const formattedMessage = formatResponse(aiResponse);
  
  // 3. Send via WhatsApp (automatic, not an AI tool!)
  await aisensyService.sendMessageWithFeedback(
    phoneNumber,
    formattedMessage
  );
}
```

---

## Special Cases

### 1. OTP Sending

**When:** User requests order tracking and needs authentication

**Flow:**
```typescript
// order.executor.ts
async function executeTrackOrder(orderId: string, phoneNumber: string) {
  // Check if user authenticated
  if (!isAuthenticated(phoneNumber)) {
    // Send OTP request to API
    await alhomaidhiAPI.sendOTP(phoneNumber);
    
    // Send OTP to user via WhatsApp (automatic, not AI tool!)
    const otp = await getOTPFromAPI(phoneNumber);
    await aisensyService.sendTextMessage(
      phoneNumber,
      `Your OTP is: ${otp}`
    );
    
    return { message: "OTP sent. Please provide the OTP code." };
  }
  
  // If authenticated, get order details
  return await getOrderDetails(orderId);
}
```

**Note:** OTP sending is handled in the tool executor, not as a separate AI tool.

---

### 2. Product Images

**When:** Product search returns products with images

**Flow:**
```typescript
// product.executor.ts
async function executeSearchProducts(query: string) {
  const products = await productService.search(query);
  
  // Return products to AI
  return products;
}

// After AI formats response
// message.handler.ts
if (aiResponse.includesProductImages) {
  // Send product images (automatic, not AI tool!)
  for (const product of products) {
    await aisensyService.sendImageMessage(
      phoneNumber,
      product.imageUrl,
      product.name
    );
  }
}
```

**Note:** Image sending is handled in response formatting, not as an AI tool.

---

### 3. Feedback Prompt

**When:** After every AI response

**Flow:**
```typescript
// message.handler.ts
// Automatically added after every response
await aisensyService.sendQuickReply(
  phoneNumber,
  "Was this helpful?",
  [
    { text: "Yes", payload: "feedback_yes" },
    { text: "No", payload: "feedback_no" }
  ]
);
```

**Note:** Feedback prompt is automatic, not an AI tool.

---

## AI Sensy API Integration

### Sending Text Message

```typescript
// api/aisensy/message.api.ts
export async function sendTextMessage(
  phoneNumber: string,
  message: string
): Promise<void> {
  await axios.post('https://backend.aisensy.com/campaign/v1/send', {
    phone_number: phoneNumber,
    message: message,
    // ... other AI Sensy parameters
  });
}
```

### Sending Quick Reply

```typescript
export async function sendQuickReply(
  phoneNumber: string,
  message: string,
  buttons: Array<{ text: string; payload: string }>
): Promise<void> {
  await axios.post('https://backend.aisensy.com/campaign/v1/send', {
    phone_number: phoneNumber,
    message: message,
    message_type: "QUICK_REPLY",
    buttons: buttons
  });
}
```

### Sending Image

```typescript
export async function sendImage(
  phoneNumber: string,
  imageUrl: string,
  caption?: string
): Promise<void> {
  await axios.post('https://backend.aisensy.com/campaign/v1/send', {
    phone_number: phoneNumber,
    message_type: "IMAGE",
    image_url: imageUrl,
    caption: caption
  });
}
```

---

## Message Flow Diagram

```
┌─────────────────────────────────────────┐
│         User Sends Message             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      AI Processes (May Call Tools)      │
│  • search_products                      │
│  • track_order                          │
│  • search_faqs                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      AI Generates Response Text         │
│  "I found 5 Nike watches: ..."          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│    Our Backend (message.handler.ts)     │
│  • Format response                      │
│  • Add feedback prompt                  │
│  • Send via AI Sensy API                │ ← NOT an AI tool!
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      AI Sensy API (WhatsApp)            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         User Receives Message           │
└─────────────────────────────────────────┘
```

---

## Summary

### What AI Tools Do
- ✅ Get data (products, orders, FAQs)
- ✅ Perform searches
- ✅ Return information to AI

### What Our Backend Does (Not Tools)
- ✅ Send messages via WhatsApp
- ✅ Format responses
- ✅ Add feedback prompts
- ✅ Send OTP codes
- ✅ Send product images
- ✅ Handle message delivery

### Key Principle

**AI generates content → Our backend sends it**

The AI doesn't decide when to send messages. We automatically send after every AI response. This is orchestration, not a tool.

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

