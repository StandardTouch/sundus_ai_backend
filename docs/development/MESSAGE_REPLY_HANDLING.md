# Message Reply Handling

## Scenario

When a user replies to a message on WhatsApp:
1. Webhook contains `replied_to_message_id` (the original message ID)
2. We need to get context of what the user is replying to
3. OpenAI needs this context to understand the conversation

## Recommended Approach: Backend Pre-fetching

**Handle reply context in the backend BEFORE sending to OpenAI.**

### Why This Approach?

✅ **Faster** - No extra tool call needed  
✅ **More reliable** - Context always available  
✅ **Simpler** - OpenAI doesn't need to decide  
✅ **Better UX** - Immediate context understanding  

### Implementation Flow

```typescript
// webhook.handler.ts
async function handleWebhook(webhookData: WebhookPayload) {
  const { message, replied_to_message_id } = webhookData;
  
  // 1. If this is a reply, fetch the original message
  let conversationContext = [];
  
  if (replied_to_message_id) {
    // Fetch original message details
    const originalMessage = await aisensyService.getMessageDetails(replied_to_message_id);
    
    if (originalMessage.success && originalMessage.message) {
      // Add original message to conversation history
      conversationContext.push({
        role: "assistant",
        content: originalMessage.message.message_content.text || ""
      });
    }
  }
  
  // 2. Add current user message
  conversationContext.push({
    role: "user",
    content: message.message_content.text
  });
  
  // 3. Send to OpenAI with full context
  const aiResponse = await openaiService.generateResponse(conversationContext);
  
  // 4. Send response
  await aisensyService.sendTextMessage(phoneNumber, aiResponse);
}
```

### Example

```
Original Message (from bot):
"Here are 5 Nike watches. Which one interests you?"

User Reply:
"Yes, the first one"

Webhook contains:
{
  message: { text: "Yes, the first one" },
  replied_to_message_id: "msg_12345"
}

Backend:
1. Fetches original message: "Here are 5 Nike watches..."
2. Sends to OpenAI:
   [
     { role: "assistant", content: "Here are 5 Nike watches..." },
     { role: "user", content: "Yes, the first one" }
   ]
3. OpenAI understands context and responds appropriately
```

---

## Alternative Approach: AI Tool (Not Recommended)

If you want OpenAI to decide when to fetch message details, you'd need to:

### 1. Add Tool Definition

```typescript
{
  type: "function",
  function: {
    name: "get_message_context",
    description: "Get the content and context of a message that the user is replying to. Use this when you see a replied_to_message_id in the conversation context to understand what the user is responding to. This helps you provide contextually relevant responses.",
    parameters: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "The message ID that the user is replying to (replied_to_message_id)"
        }
      },
      required: ["message_id"]
    }
  }
}
```

### 2. Include replied_to_message_id in Context

```typescript
// When sending to OpenAI
const messages = [
  ...conversationHistory,
  {
    role: "user",
    content: `User message: "${userMessage}"\n\nThis is a reply to message ID: ${replied_to_message_id}`
  }
];
```

### 3. AI Decides

OpenAI might call `get_message_context` if it sees the `replied_to_message_id` and understands it needs context.

### Why This Is Not Recommended

❌ **Slower** - Extra API call (tool call + message fetch)  
❌ **Less reliable** - AI might not always call it  
❌ **More complex** - Requires AI to understand reply context  
❌ **Extra cost** - Additional OpenAI API call  

---

## Best Practice: Smart Context Optimization

**Use reply-based context building for optimal token efficiency:**

1. **Find replied-to message in stored history** (by `message_id`)
2. **Include context window** around replied-to message (±3-5 messages)
3. **Token efficient** - Send ~7-11 messages instead of all 20
4. **Contextually relevant** - OpenAI sees conversation thread

### Implementation

```typescript
// message.handler.ts
async function buildOptimizedContext(
  storedMessages: ConversationMessage[],  // Last 20 from DB
  currentMessage: ConversationMessage,
  repliedToMessageId?: string
) {
  // Case 1: User replied to a message
  if (repliedToMessageId) {
    // Find replied-to message in stored history
    const repliedToIndex = storedMessages.findIndex(
      m => m.message_id === repliedToMessageId
    );
    
    if (repliedToIndex !== -1) {
      // Include context window around replied-to message
      const CONTEXT_BEFORE = 3;  // Messages before
      const CONTEXT_AFTER = 3;   // Messages after
      
      const startIndex = Math.max(0, repliedToIndex - CONTEXT_BEFORE);
      const endIndex = Math.min(
        storedMessages.length, 
        repliedToIndex + CONTEXT_AFTER + 1
      );
      
      // Get contextually relevant messages
      const contextMessages = storedMessages.slice(startIndex, endIndex);
      
      // Add current reply
      return [...contextMessages, currentMessage];
    }
    
    // Fallback: If message not found, use recent messages
    return storedMessages.slice(-8).concat(currentMessage);
  }
  
  // Case 2: New message (no reply)
  // Use last 8 messages for context
  return storedMessages.slice(-8).concat(currentMessage);
}

// Usage
async function handleWebhook(webhookData: WebhookPayload) {
  const { message, replied_to_message_id } = webhookData;
  
  // Load stored messages (last 20)
  const storedMessages = await conversationMessageRepository.getRecentMessages(
    phoneNumber, 
    20
  );
  
  // Build optimized context
  const conversationContext = buildOptimizedContext(
    storedMessages,
    currentMessage,
    replied_to_message_id
  );
  
  // Send to OpenAI with optimized context
  const response = await openaiService.generateResponse(conversationContext);
}
```

### Example: Reply-Based Context

**Stored History (20 messages):**
```
1. User: "Hi"
2. AI: "Hello! How can I help?"
3. User: "Show me watches"
4. AI: "Here are some watches..." [Message ID: msg_123]
5. User: "What about Nike?"
6. AI: "Nike watches..." [Message ID: msg_456]
7. User: "Thanks"
8. AI: "You're welcome!"
9. User: "What's the price?" [REPLIES TO msg_123]
```

**When user replies to `msg_123` (message #4):**

**Smart Context (reply-based):**
```
Messages 2-6: 
  - "Hello! How can I help?" (context)
  - "Show me watches" (original query)
  - "Here are some watches..." [msg_123] (replied-to message)
  - "What about Nike?" (follow-up)
  - "Nike watches..." (related)
+ Current reply: "What's the price?"
→ Result: 6 messages (contextually relevant, token efficient)
```

**Old Approach (last 8 messages):**
```
Messages 3-9: "Show me watches" → "What's the price?"
→ Result: 7 messages (but missing original watch list context)
```

### Benefits

- ✅ **Token Efficient:** 60-70% reduction vs sending all 20 messages
- ✅ **Contextually Relevant:** Includes conversation thread around reply
- ✅ **Smart:** Adapts based on reply vs new message
- ✅ **Cost Effective:** Lower OpenAI API costs

---

## Summary

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Backend Pre-fetch** | Fast, reliable, simple | None | ✅ **Use this** |
| **AI Tool** | Flexible | Slower, less reliable | ⚠️ Optional for edge cases |
| **Smart Context (Reply-based)** | Fast, token efficient, contextually relevant | Requires stored history | ✅ **✅ Recommended** |
| **Hybrid** | Fast + flexible | Slightly more complex | ✅ **Best practice** |

**Recommendation:** Use **smart context optimization** (reply-based context building). It's:
- ✅ **Fast** - No extra API calls
- ✅ **Token efficient** - 60-70% reduction vs full history
- ✅ **Contextually relevant** - Includes conversation thread
- ✅ **Cost effective** - Lower OpenAI API costs

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

