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

## Best Practice: Hybrid Approach

**Use backend pre-fetching for replies, but also add the tool for edge cases:**

1. **Backend automatically fetches** reply context (recommended)
2. **Tool available** if AI needs to fetch other message contexts
3. **Best of both worlds** - Fast for common case, flexible for edge cases

### Implementation

```typescript
// webhook.handler.ts
async function handleWebhook(webhookData: WebhookPayload) {
  const { message, replied_to_message_id } = webhookData;
  
  let conversationContext = [];
  
  // Backend pre-fetches reply context
  if (replied_to_message_id) {
    const originalMessage = await aisensyService.getMessageDetails(replied_to_message_id);
    if (originalMessage.success) {
      conversationContext.push({
        role: "assistant",
        content: originalMessage.message.message_content.text
      });
    }
  }
  
  // Add current message
  conversationContext.push({
    role: "user",
    content: message.message_content.text
  });
  
  // Send to OpenAI with tools (including get_message_context for edge cases)
  const response = await openaiService.generateResponse(conversationContext, tools);
}
```

---

## Summary

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Backend Pre-fetch** | Fast, reliable, simple | None | ✅ **Use this** |
| **AI Tool** | Flexible | Slower, less reliable | ⚠️ Optional for edge cases |
| **Hybrid** | Fast + flexible | Slightly more complex | ✅ **Best practice** |

**Recommendation:** Use backend pre-fetching for reply context. It's faster, more reliable, and simpler.

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

