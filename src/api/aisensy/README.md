# AI Sensy WhatsApp API Integration

## Overview

This module handles sending WhatsApp messages via AI Sensy API.

## API Details

**Endpoint:** `POST https://apis.aisensy.com/project-apis/v1/project/{projectId}/messages`

**Headers:**
- `Accept: application/json`
- `Content-Type: application/json`
- `X-AiSensy-Partner-API-Key: {apiKey}`

## Usage

### Basic Text Message

```typescript
import { AISensyService } from "../../services/aisensy.service.js";

const service = new AISensyService();

await service.sendTextMessage(
  "917089379345",  // Phone number (without country code)
  "Hello from Sundus AI!"
);
```

### Message with Feedback Prompt

```typescript
await service.sendMessageWithFeedback(
  "917089379345",
  "I found 5 Nike watches for you..."
);
// Automatically adds "Was this helpful? Yes/No" buttons
```

### Image Message

```typescript
await service.sendImageMessage(
  "917089379345",
  "https://example.com/image.jpg",
  "Product image caption"
);
```

### Quick Reply Buttons

```typescript
await service.sendQuickReplyMessage(
  "917089379345",
  "Choose an option:",
  [
    { text: "Yes", payload: "yes" },
    { text: "No", payload: "no" }
  ]
);
```

## Environment Variables

```env
AISENSY_API_BASE_URL=https://apis.aisensy.com
AISENSY_API_KEY=your_api_key_here
AISENSY_PROJECT_ID=655b383d2c1f7c51b62a7338
AISENSY_TIMEOUT=10000
```

## Response Format

### Send Message Response

```typescript
{
  success: boolean;
  message_id?: string;  // WhatsApp message ID
  wa_id?: string;       // WhatsApp ID
  error?: string;       // Error message if failed
  status?: number;      // HTTP status code
}
```

### Get Message Details

```typescript
// Get message details
const details = await service.getMessageDetails(messageId);

// Response:
{
  success: boolean;
  message?: {
    id: string;
    phone_number: string;
    message_type: "TEXT" | "IMAGE" | ...;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    sent_at: number;
    delivered_at: number | null;
    read_at: number | null;
    message_content: { text?: string; ... };
    // ... other fields
  };
  error?: string;
  status?: number;
}
```

### Check Message Status

```typescript
// Check if message was read
const isRead = await service.isMessageRead(messageId);

// Get message status
const status = await service.getMessageStatus(messageId);
// Returns: "SENT" | "DELIVERED" | "READ" | "FAILED" | null
```

