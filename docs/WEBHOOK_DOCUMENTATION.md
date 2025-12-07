# WhatsApp Webhook Documentation

## Overview

This document describes the webhook payload structure received from the WhatsApp messaging platform. All webhooks follow a consistent base structure with varying `message_content` based on the `message_type`.

## Base Webhook Structure

All webhook payloads share the following common structure:

```json
{
  "id": "string",
  "created_at": "ISO 8601 timestamp",
  "topic": "message.sender.user",
  "project_id": "string",
  "delivery_attempt": "1",
  "data": {
    "message": {
      // Message-specific fields
    }
  }
}
```

### Base Fields

| Field              | Type   | Description                                                    |
| ------------------ | ------ | -------------------------------------------------------------- |
| `id`               | string | Unique webhook event ID                                        |
| `created_at`       | string | ISO 8601 timestamp when webhook was created                    |
| `topic`            | string | Webhook topic (always "message.sender.user" for user messages) |
| `project_id`       | string | Project identifier                                             |
| `delivery_attempt` | string | Delivery attempt number (usually "1")                          |

## Common Message Fields

All messages within `data.message` contain these common fields:

| Field                           | Type           | Description                                                                   |
| ------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `type`                          | string         | Always "message"                                                              |
| `id`                            | string         | Unique message ID                                                             |
| `meta_data`                     | array          | Metadata array (usually empty)                                                |
| `project_id`                    | string         | Project identifier                                                            |
| `phone_number`                  | string         | User's phone number (without country code prefix)                             |
| `contact_id`                    | string         | Contact identifier                                                            |
| `campaign`                      | object \| null | Campaign information (null for most messages, populated for replied messages) |
| `sender`                        | string         | Sender type (always "USER" for user messages)                                 |
| `message_content`               | object         | Message content (structure varies by message_type)                            |
| `message_type`                  | string         | Type of message (TEXT, IMAGE, AUDIO, etc.)                                    |
| `status`                        | string         | Message status (usually "DELIVERED")                                          |
| `is_HSM`                        | boolean        | Whether message is HSM (High-Structured Message)                              |
| `chatbot_response`              | null           | Chatbot response (usually null)                                               |
| `agent_id`                      | null           | Agent ID (usually null)                                                       |
| `sent_at`                       | number         | Timestamp when message was sent (milliseconds)                                |
| `delivered_at`                  | number         | Timestamp when message was delivered (milliseconds)                           |
| `read_at`                       | number \| null | Timestamp when message was read (usually null)                                |
| `failureResponse`               | object         | Failure response object (usually empty)                                       |
| `userName`                      | string         | User's display name                                                           |
| `countryCode`                   | string         | Country code (e.g., "91")                                                     |
| `submitted_message_id`          | string         | Submitted message ID (usually empty string)                                   |
| `message_price`                 | number         | Message price (usually 0)                                                     |
| `deductionType`                 | null           | Deduction type (usually null)                                                 |
| `mau_details`                   | null           | MAU details (usually null)                                                    |
| `whatsapp_conversation_details` | null           | Conversation details (usually null)                                           |
| `context`                       | object \| null | Context information (null for most, populated for QUICK_REPLY and REPLIED)    |
| `messageId`                     | string         | WhatsApp message ID (wamid format)                                            |

## Message Types

### 1. TEXT

**File**: `on_message_received.json`

**Message Type**: `"TEXT"`

**Message Content Structure**:

```json
{
  "message_content": {
    "text": "message text here"
  }
}
```

**Example**:

```json
{
  "id": "691af634a77a309eeff49f7b",
  "created_at": "2025-11-17T10:17:24.109Z",
  "topic": "message.sender.user",
  "project_id": "655b383d2c1f7c51b62a7338",
  "delivery_attempt": "1",
  "data": {
    "message": {
      "type": "message",
      "id": "691af6345bae1b0fae7dba55",
      "message_type": "TEXT",
      "message_content": {
        "text": "yaseen hello"
      },
      "context": null
    }
  }
}
```

---

### 2. QUICK_REPLY

**File**: `on_message_quick_reply.json`

**Message Type**: `"QUICK_REPLY"`

**Message Content Structure**:

```json
{
  "message_content": {
    "text": "Display text",
    "callbackPayload": "Payload value"
  }
}
```

**Special Fields**:

- `context`: Contains `from` and `id` fields linking to the original message

**Example**:

```json
{
  "message_type": "QUICK_REPLY",
  "message_content": {
    "text": "Excellent",
    "callbackPayload": "Excellent"
  },
  "context": {
    "from": "966920009339",
    "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSQzY4NEM4OEREQ0QwQjY5MEVBAA=="
  }
}
```

---

### 3. IMAGE

**File**: `on_message_photo_or_video.json`

**Message Type**: `"IMAGE"`

**Message Content Structure**:

```json
{
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/image/...",
    "urlExpiry": "",
    "mimeType": "image/jpeg"
  }
}
```

**Fields**:

- `url`: CloudFront CDN URL to the image
- `urlExpiry`: URL expiry (usually empty string)
- `mimeType`: MIME type of the image (e.g., "image/jpeg", "image/png")

**Example**:

```json
{
  "message_type": "IMAGE",
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/image/655b383d2c1f7c51b62a7338/zkugxzqm_wamidHBgMOTE3Njc2MDc5MTYzFQIAEhgWM0VCMDdEMjE2QjVGNTNFNjYwMjlDQwA",
    "urlExpiry": "",
    "mimeType": "image/jpeg"
  }
}
```

---

### 4. FILE

**File**: `on_message_file.json`

**Message Type**: `"FILE"`

**Message Content Structure**:

```json
{
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/document/...",
    "urlExpiry": "",
    "mimeType": "image/png"
  }
}
```

**Note**: Files can have various MIME types (images, PDFs, documents, etc.)

**Example**:

```json
{
  "message_type": "FILE",
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/document/655b383d2c1f7c51b62a7338/bzegtxot_wamidHBgMOTE3Njc2MDc5MTYzFQIAEhgWM0VCMEE4Qzc2REZFMEQ5REQ3MzMyQgA",
    "urlExpiry": "",
    "mimeType": "image/png"
  }
}
```

---

### 5. AUDIO

**File**: `on_message_audio.json`

**Message Type**: `"AUDIO"`

**Message Content Structure**:

```json
{
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/audio/...",
    "urlExpiry": "",
    "mimeType": "audio/mpeg"
  }
}
```

**Example**:

```json
{
  "message_type": "AUDIO",
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/audio/655b383d2c1f7c51b62a7338/juvajxrn_wamidHBgMOTE3Njc2MDc5MTYzFQIAEhgWM0VCMDNEMUNGRDU5ODdCMjE0QjEyMQA",
    "urlExpiry": "",
    "mimeType": "audio/mpeg"
  }
}
```

---

### 6. STICKER

**File**: `on_message_sticker.json`

**Message Type**: `"STICKER"`

**Message Content Structure**:

```json
{
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/sticker/...",
    "urlExpiry": "",
    "mimeType": "image/webp"
  }
}
```

**Example**:

```json
{
  "message_type": "STICKER",
  "message_content": {
    "url": "https://d2npdtryso7wvr.cloudfront.net/sticker/655b383d2c1f7c51b62a7338/zdyestjp_wamidHBgMOTE3Njc2MDc5MTYzFQIAEhgWM0VCMEIyNkI5NkE4RDI2QzQ0MzFCQQA",
    "urlExpiry": "",
    "mimeType": "image/webp"
  }
}
```

---

### 7. LOCATION

**File**: `on_message_location.json`

**Message Type**: `"LOCATION"`

**Message Content Structure**:

```json
{
  "message_content": {
    "longitude": 76.829864501953,
    "latitude": 17.317714691162,
    "address": "",
    "name": "",
    "url": ""
  }
}
```

**Fields**:

- `longitude`: Longitude coordinate (number)
- `latitude`: Latitude coordinate (number)
- `address`: Address string (often empty)
- `name`: Location name (often empty)
- `url`: Location URL (often empty)

**Example**:

```json
{
  "message_type": "LOCATION",
  "message_content": {
    "longitude": 76.829864501953,
    "latitude": 17.317714691162,
    "address": "",
    "name": "",
    "url": ""
  }
}
```

---

### 8. CONTACT

**File**: `on_message_contact.json`

**Message Type**: `"CONTACT"`

**Message Content Structure**:

```json
{
  "message_content": {
    "contacts": [
      {
        "name": {
          "first_name": "Furqan",
          "last_name": "ST",
          "formatted_name": "Furqan ST"
        },
        "phones": [
          {
            "phone": "+91 72047 08561",
            "wa_id": "917204708561",
            "type": "CELL"
          }
        ]
      }
    ]
  }
}
```

**Fields**:

- `contacts`: Array of contact objects
  - `name`: Contact name object
    - `first_name`: First name
    - `last_name`: Last name
    - `formatted_name`: Full formatted name
  - `phones`: Array of phone objects
    - `phone`: Formatted phone number with country code
    - `wa_id`: WhatsApp ID (phone number without formatting)
    - `type`: Phone type (e.g., "CELL", "MAIN", "WORK")

**Example**:

```json
{
  "message_type": "CONTACT",
  "message_content": {
    "contacts": [
      {
        "name": {
          "first_name": "Furqan",
          "last_name": "ST",
          "formatted_name": "Furqan ST"
        },
        "phones": [
          {
            "phone": "+91 72047 08561",
            "wa_id": "917204708561",
            "type": "CELL"
          }
        ]
      }
    ]
  }
}
```

---

### 9. REPLIED MESSAGE

**File**: `on_message_replied.json`

**Message Type**: `"TEXT"` (but with special fields)

**Special Characteristics**:

- Same structure as TEXT message
- `campaign` field is populated (not null)
- `context` field contains reference to original message

**Message Content Structure**:

```json
{
  "message_content": {
    "text": "this is replied message"
  },
  "campaign": {
    "name": "ST ANB Offer DEMO Ar 3",
    "_id": "66b4c51d2427360de0483f43"
  },
  "context": {
    "from": "966920009339",
    "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSODg3RUVCRTExOUFFMDQ5NzFEAA=="
  }
}
```

**Example**:

```json
{
  "message_type": "TEXT",
  "message_content": {
    "text": "this is replied message"
  },
  "campaign": {
    "name": "ST ANB Offer DEMO Ar 3",
    "_id": "66b4c51d2427360de0483f43"
  },
  "context": {
    "from": "966920009339",
    "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSODg3RUVCRTExOUFFMDQ5NzFEAA=="
  }
}
```

---

## Patterns & Observations

### Media URLs

All media types (IMAGE, FILE, AUDIO, STICKER) use CloudFront CDN URLs with the following pattern:

- **Images**: `https://d2npdtryso7wvr.cloudfront.net/image/{project_id}/{filename}`
- **Documents**: `https://d2npdtryso7wvr.cloudfront.net/document/{project_id}/{filename}`
- **Audio**: `https://d2npdtryso7wvr.cloudfront.net/audio/{project_id}/{filename}`
- **Stickers**: `https://d2npdtryso7wvr.cloudfront.net/sticker/{project_id}/{filename}`

### Context Field

The `context` field is populated in:

- **QUICK_REPLY** messages: Links to the original message that triggered the quick reply
- **REPLIED** messages: Links to the original message being replied to

Structure:

```json
{
  "context": {
    "from": "phone_number",
    "id": "wamid_message_id"
  }
}
```

### Campaign Field

The `campaign` field is:

- `null` for most message types
- Populated only in **REPLIED** messages with campaign information

Structure:

```json
{
  "campaign": {
    "name": "Campaign Name",
    "_id": "campaign_id"
  }
}
```

### Empty/Null Fields

Many fields are commonly empty or null:

- `urlExpiry`: Usually empty string
- `submitted_message_id`: Usually empty string
- `read_at`: Usually null
- `campaign`: Usually null (except replied messages)
- `context`: Usually null (except QUICK_REPLY and REPLIED)
- `chatbot_response`: Always null
- `agent_id`: Always null
- `deductionType`: Always null
- `mau_details`: Always null
- `whatsapp_conversation_details`: Always null

### Message ID Format

WhatsApp message IDs follow the format:

```
wamid.HBgMOTE3Njc2MDc5MTYzFQIAEhgWM0VCMDEwOUQ0NjUzRUYwQkVBMjNFOQA=
```

### Timestamps

All timestamps are in milliseconds:

- `sent_at`: When message was sent
- `delivered_at`: When message was delivered
- `read_at`: When message was read (usually null)

---

## Message Type Summary

| Message Type | Content Structure                                                                     | Special Fields        |
| ------------ | ------------------------------------------------------------------------------------- | --------------------- |
| TEXT         | `{ text: string }`                                                                    | None                  |
| QUICK_REPLY  | `{ text: string, callbackPayload: string }`                                           | `context`             |
| IMAGE        | `{ url: string, urlExpiry: string, mimeType: string }`                                | None                  |
| FILE         | `{ url: string, urlExpiry: string, mimeType: string }`                                | None                  |
| AUDIO        | `{ url: string, urlExpiry: string, mimeType: string }`                                | None                  |
| STICKER      | `{ url: string, urlExpiry: string, mimeType: string }`                                | None                  |
| LOCATION     | `{ longitude: number, latitude: number, address: string, name: string, url: string }` | None                  |
| CONTACT      | `{ contacts: array }`                                                                 | None                  |
| REPLIED      | `{ text: string }`                                                                    | `campaign`, `context` |

---

## Implementation Recommendations

1. **Type Safety**: Create TypeScript interfaces/types for each message type
2. **Message Router**: Implement a message type router/handler based on `message_type`
3. **Media Handling**: Extract and process media URLs for downloading/storage
4. **Context Tracking**: Handle `context` field for threaded conversations
5. **Campaign Tracking**: Parse `campaign` data for analytics and tracking
6. **Error Handling**: Handle cases where `message_content` structure might vary
7. **Validation**: Validate required fields before processing each message type

---

## Example Webhook Handler Structure

```typescript
interface WebhookPayload {
  id: string;
  created_at: string;
  topic: string;
  project_id: string;
  delivery_attempt: string;
  data: {
    message: {
      message_type: string;
      message_content: any;
      // ... other fields
    };
  };
}

// Route based on message_type
switch (payload.data.message.message_type) {
  case "TEXT":
    handleTextMessage(payload);
    break;
  case "QUICK_REPLY":
    handleQuickReply(payload);
    break;
  case "IMAGE":
    handleImageMessage(payload);
    break;
  // ... etc
}
```

---

_Last Updated: Based on webhook responses collected in `webhook_responses/` directory_
