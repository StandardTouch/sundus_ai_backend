# AI Sensy Mock Webhook Server

A smart mock server for generating and sending AI Sensy WhatsApp webhook payloads to your local server.

## Features

- 🎯 **Smart Webhook Generation**: Automatically generates appropriate payloads based on message type
- 🔧 **Configurable Fields**: Override any field dynamically from the request
- 📊 **Field Analysis**: Analyzes expected fields for each message type
- 🚀 **Auto-send**: Sends webhooks directly to localhost:3000 (configurable)
- 🎨 **Multiple Message Types**: Supports all AI Sensy message types

## Installation

```bash
cd mock_server
npm install
```

## Usage

### Start the server

```bash
npm run dev
# or
npm start
```

The server will start on port **3001** by default (configurable via `MOCK_SERVER_PORT` env variable).

### Target Server

By default, webhooks are sent to `http://localhost:3000`. You can change this:
- Set `TARGET_WEBHOOK_URL` environment variable
- Or use the `/webhook/target` endpoint

## API Endpoints

### 1. Send Webhook (Main Endpoint)

**POST** `/webhook/send`

Send a webhook with configurable fields.

```json
{
  "message_type": "TEXT",
  "text": "Hello from mock server!",
  "phone_number": "917676079163",
  "userName": "Test User"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook sent successfully",
  "targetUrl": "http://localhost:3000",
  "payload": { ... },
  "response": { ... }
}
```

### 2. Preview Webhook

**POST** `/webhook/preview`

Generate a webhook payload without sending it.

```json
{
  "message_type": "TEXT",
  "text": "Preview only"
}
```

### 3. Analyze Expected Fields

**GET** `/webhook/analyze/:messageType`

Get information about expected fields for a message type.

```
GET /webhook/analyze/TEXT
GET /webhook/analyze/IMAGE
GET /webhook/analyze/QUICK_REPLY
```

### 4. Quick Send Endpoints

**POST** `/webhook/send/:type`

Quick send endpoints for each message type:
- `/webhook/send/text`
- `/webhook/send/image`
- `/webhook/send/audio`
- `/webhook/send/file`
- `/webhook/send/sticker`
- `/webhook/send/location`
- `/webhook/send/contact`
- `/webhook/send/quick_reply`

### 5. Target URL Management

**GET** `/webhook/target` - Get current target URL

**POST** `/webhook/target` - Set target URL
```json
{
  "url": "http://localhost:3000"
}
```

## Message Types & Examples

### TEXT Message

```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "Hello, this is a test message"
  }'
```

### QUICK_REPLY Message

```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "QUICK_REPLY",
    "text": "Excellent",
    "callbackPayload": "excellent_rating"
  }'
```

### IMAGE Message

```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "IMAGE",
    "url": "https://example.com/image.jpg",
    "mimeType": "image/jpeg"
  }'
```

### LOCATION Message

```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "LOCATION",
    "longitude": 76.829864501953,
    "latitude": 17.317714691162,
    "address": "Test Location"
  }'
```

### CONTACT Message

```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "CONTACT",
    "contactName": {
      "first_name": "John",
      "last_name": "Doe",
      "formatted_name": "John Doe"
    },
    "contactPhone": {
      "phone": "+91 98765 43210",
      "wa_id": "919876543210",
      "type": "CELL"
    }
  }'
```

## Smart Defaults

The server intelligently generates defaults for missing fields:

- **Phone Number**: `917676079163` (if not provided)
- **Contact ID**: Auto-generated
- **User Name**: `Yaseen` (if not provided)
- **Project ID**: `655b383d2c1f7c51b62a7338` (if not provided)
- **Media URLs**: Auto-generated CloudFront URLs based on message type
- **Timestamps**: Current timestamp
- **Message IDs**: Auto-generated in correct format

## Environment Variables

- `MOCK_SERVER_PORT`: Port for mock server (default: 3001)
- `TARGET_WEBHOOK_URL`: Target URL for webhooks (default: http://localhost:3000)

## Example Workflow

1. Start your main server on port 3000
2. Start the mock server: `npm run dev`
3. Send a test webhook:
   ```bash
   curl -X POST http://localhost:3001/webhook/send/text \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```
4. Check your main server logs to see the received webhook

