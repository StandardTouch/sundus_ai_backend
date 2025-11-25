# Postman cURL Commands Collection

Copy these cURL commands and import them into Postman, or use them directly in your terminal.

## Base URL
```
http://localhost:3001
```

---

## 1. Health & Info Endpoints

### Get Server Info
```bash
curl -X GET http://localhost:3001/
```

### Health Check
```bash
curl -X GET http://localhost:3001/health
```

---

## 2. Target URL Management

### Get Current Target URL
```bash
curl -X GET http://localhost:3001/webhook/target
```

### Set Target URL
```bash
curl -X POST http://localhost:3001/webhook/target \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000"
  }'
```

---

## 3. Field Analysis

### Analyze TEXT Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/TEXT
```

### Analyze QUICK_REPLY Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/QUICK_REPLY
```

### Analyze IMAGE Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/IMAGE
```

### Analyze FILE Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/FILE
```

### Analyze AUDIO Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/AUDIO
```

### Analyze STICKER Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/STICKER
```

### Analyze LOCATION Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/LOCATION
```

### Analyze CONTACT Message Fields
```bash
curl -X GET http://localhost:3001/webhook/analyze/CONTACT
```

---

## 4. Preview Webhook (Without Sending)

### Preview TEXT Message
```bash
curl -X POST http://localhost:3001/webhook/preview \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "This is a preview message"
  }'
```

### Preview QUICK_REPLY Message
```bash
curl -X POST http://localhost:3001/webhook/preview \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "QUICK_REPLY",
    "text": "Excellent",
    "callbackPayload": "excellent_rating"
  }'
```

### Preview IMAGE Message
```bash
curl -X POST http://localhost:3001/webhook/preview \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "IMAGE",
    "url": "https://example.com/image.jpg",
    "mimeType": "image/jpeg"
  }'
```

---

## 5. Send Webhook - Main Endpoint

### Send TEXT Message (Basic)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "Hello, this is a test message"
  }'
```

### Send TEXT Message (With Custom Fields)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "Hello from custom user",
    "phone_number": "919876543210",
    "userName": "John Doe",
    "countryCode": "91"
  }'
```

### Send TEXT Message (Replied - With Context & Campaign)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "This is a replied message",
    "campaign": {
      "name": "Test Campaign",
      "_id": "66b4c51d2427360de0483f43"
    },
    "context": {
      "from": "966920009339",
      "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSODg3RUVCRTExOUFFMDQ5NzFEAA=="
    }
  }'
```

### Send QUICK_REPLY Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "QUICK_REPLY",
    "text": "Excellent",
    "callbackPayload": "excellent_rating"
  }'
```

### Send QUICK_REPLY Message (With Context)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "QUICK_REPLY",
    "text": "Good",
    "callbackPayload": "good_rating",
    "context": {
      "from": "966920009339",
      "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSQzY4NEM4OEREQ0QwQjY5MEVBAA=="
    }
  }'
```

### Send IMAGE Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "IMAGE",
    "url": "https://d2npdtryso7wvr.cloudfront.net/image/655b383d2c1f7c51b62a7338/test_image.jpg",
    "mimeType": "image/jpeg"
  }'
```

### Send IMAGE Message (PNG)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "IMAGE",
    "url": "https://example.com/image.png",
    "mimeType": "image/png"
  }'
```

### Send FILE Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "FILE",
    "url": "https://d2npdtryso7wvr.cloudfront.net/document/655b383d2c1f7c51b62a7338/test_file.pdf",
    "mimeType": "application/pdf"
  }'
```

### Send FILE Message (Image as Document)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "FILE",
    "url": "https://example.com/document.png",
    "mimeType": "image/png"
  }'
```

### Send AUDIO Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "AUDIO",
    "url": "https://d2npdtryso7wvr.cloudfront.net/audio/655b383d2c1f7c51b62a7338/test_audio.mp3",
    "mimeType": "audio/mpeg"
  }'
```

### Send AUDIO Message (OGG)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "AUDIO",
    "url": "https://example.com/audio.ogg",
    "mimeType": "audio/ogg"
  }'
```

### Send STICKER Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "STICKER",
    "url": "https://d2npdtryso7wvr.cloudfront.net/sticker/655b383d2c1f7c51b62a7338/test_sticker.webp",
    "mimeType": "image/webp"
  }'
```

### Send LOCATION Message
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "LOCATION",
    "longitude": 76.829864501953,
    "latitude": 17.317714691162,
    "address": "Test Location Address",
    "locationName": "Test Place"
  }'
```

### Send LOCATION Message (With URL)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "LOCATION",
    "longitude": -122.4194,
    "latitude": 37.7749,
    "address": "San Francisco, CA",
    "locationName": "San Francisco",
    "url": "https://maps.google.com/?q=37.7749,-122.4194"
  }'
```

### Send CONTACT Message
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

### Send CONTACT Message (Multiple Phones)
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "CONTACT",
    "contactName": {
      "first_name": "Jane",
      "last_name": "Smith",
      "formatted_name": "Jane Smith"
    },
    "contactPhone": {
      "phone": "+1 555-123-4567",
      "wa_id": "15551234567",
      "type": "MAIN"
    }
  }'
```

---

## 6. Quick Send Endpoints (Type-Specific)

### Quick Send TEXT
```bash
curl -X POST http://localhost:3001/webhook/send/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Quick text message"
  }'
```

### Quick Send TEXT (With Overrides)
```bash
curl -X POST http://localhost:3001/webhook/send/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Custom text",
    "phone_number": "919876543210",
    "userName": "Test User"
  }'
```

### Quick Send QUICK_REPLY
```bash
curl -X POST http://localhost:3001/webhook/send/quick_reply \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Great!",
    "callbackPayload": "great_response"
  }'
```

### Quick Send IMAGE
```bash
curl -X POST http://localhost:3001/webhook/send/image \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/photo.jpg",
    "mimeType": "image/jpeg"
  }'
```

### Quick Send FILE
```bash
curl -X POST http://localhost:3001/webhook/send/file \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/document.pdf",
    "mimeType": "application/pdf"
  }'
```

### Quick Send AUDIO
```bash
curl -X POST http://localhost:3001/webhook/send/audio \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/audio.mp3",
    "mimeType": "audio/mpeg"
  }'
```

### Quick Send STICKER
```bash
curl -X POST http://localhost:3001/webhook/send/sticker \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/sticker.webp",
    "mimeType": "image/webp"
  }'
```

### Quick Send LOCATION
```bash
curl -X POST http://localhost:3001/webhook/send/location \
  -H "Content-Type: application/json" \
  -d '{
    "longitude": 77.2090,
    "latitude": 28.6139,
    "address": "New Delhi, India"
  }'
```

### Quick Send CONTACT
```bash
curl -X POST http://localhost:3001/webhook/send/contact \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": {
      "first_name": "Alice",
      "last_name": "Johnson",
      "formatted_name": "Alice Johnson"
    },
    "contactPhone": {
      "phone": "+1 555-987-6543",
      "wa_id": "15559876543",
      "type": "CELL"
    }
  }'
```

---

## 7. Advanced Examples

### TEXT Message with All Custom Fields
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "TEXT",
    "text": "Fully customized message",
    "phone_number": "919876543210",
    "contact_id": "65a7adb1aea3c70bc8b7a0d7",
    "userName": "Custom User",
    "countryCode": "91",
    "project_id": "655b383d2c1f7c51b62a7338"
  }'
```

### QUICK_REPLY with Full Context
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "QUICK_REPLY",
    "text": "Perfect",
    "callbackPayload": "perfect_rating",
    "phone_number": "917676079163",
    "userName": "Yaseen",
    "context": {
      "from": "966920009339",
      "id": "wamid.HBgMOTE3Njc2MDc5MTYzFQIAERgSQzY4NEM4OEREQ0QwQjY5MEVBAA=="
    }
  }'
```

### IMAGE with Custom Project
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "IMAGE",
    "url": "https://d2npdtryso7wvr.cloudfront.net/image/custom_project_id/custom_image.jpg",
    "mimeType": "image/jpeg",
    "project_id": "custom_project_id_12345"
  }'
```

---

## Importing into Postman

### Method 1: Import cURL Commands
1. Open Postman
2. Click **Import** button (top left)
3. Select **Raw text** tab
4. Paste any cURL command above
5. Click **Continue** and **Import**

### Method 2: Create Collection Manually
1. Create a new Collection in Postman
2. For each endpoint, create a new request
3. Copy the cURL command
4. In Postman, click **Import** → **Raw text** → Paste cURL → Import

### Method 3: Use Postman Collection JSON
See the `postman_collection.json` file (if available) for direct import.

---

## Tips

1. **Change Base URL**: Replace `localhost:3001` with your server URL
2. **Modify Payloads**: Edit the JSON in `-d` flag to customize requests
3. **Add Headers**: Add more headers with `-H "Header-Name: value"`
4. **Save Responses**: Use `> response.json` to save responses to file
5. **Verbose Mode**: Add `-v` flag to see full request/response details

---

## Example: Save Response to File
```bash
curl -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{"message_type": "TEXT", "text": "Test"}' \
  > response.json
```

---

## Example: Verbose Output
```bash
curl -v -X POST http://localhost:3001/webhook/send \
  -H "Content-Type: application/json" \
  -d '{"message_type": "TEXT", "text": "Test"}'
```

