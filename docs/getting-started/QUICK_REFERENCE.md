# Sundus AI - Quick Reference Guide

## Feature Summary

| Feature | Status | Priority | Complexity |
|---------|--------|----------|------------|
| Smart Multilingual Responses | ✅ Feasible | High | Medium |
| Feedback Mechanism | ✅ Feasible | High | Low |
| Human Escalation | ✅ Feasible | High | Medium |
| Order Tracking (OTP) | ✅ Feasible | High | Medium |
| FAQ System (Vector DB) | ✅ Feasible | Medium | High |
| Product Search | ✅ Feasible | Medium | Medium |

## Core Requirements Checklist

### 1. Smart Responses (EN/AR)
- [ ] OpenAI API integration
- [ ] Language detection
- [ ] Bilingual prompt engineering
- [ ] Context management
- [ ] Conversation message storage (last 20 per user)
- [ ] Auto-cleanup old messages

### 2. Feedback System
- [ ] Quick reply message generation
- [ ] Feedback tracking database
- [ ] Analytics collection

### 3. Escalation
- [ ] Negative feedback counter
- [ ] Threshold configuration
- [ ] AI Sensy handover API
- [ ] Escalation notifications

### 4. Order Tracking
- [ ] OTP generation service
- [ ] OTP delivery via WhatsApp
- [ ] OTP verification
- [ ] Order system API integration
- [ ] Order details formatting

### 5. FAQ System
- [ ] Vector database setup
- [ ] Embedding generation pipeline
- [ ] Semantic search implementation
- [ ] Admin API for FAQ management
- [ ] FAQ versioning

### 6. Product Search
- [ ] Product database integration
- [ ] SKU search
- [ ] Brand search
- [ ] Response formatting with links

## Message Flow Examples

### Standard Chat Flow
```
User → WhatsApp → AI Sensy → Webhook → Sundus AI
                                              ↓
                                    Check if reply (replied_to_message_id)
                                              ↓
                                    If reply: Fetch original message context
                                              ↓
                                    Load conversation history
                                              ↓
                                    OpenAI Processing (with tools)
                                              ↓
                                    Response Generation
                                              ↓
                                    Feedback Prompt
                                              ↓
Sundus AI → AI Sensy → WhatsApp → User
```

### Reply Handling Flow
```
User replies to message → Webhook with replied_to_message_id
                                              ↓
                                    Backend fetches original message
                                    (using getMessageDetails - not AI tool)
                                              ↓
                                    Add original message to conversation history
                                              ↓
                                    Send to OpenAI with full context
                                              ↓
                                    AI understands reply context automatically
                                              ↓
                                    Generate contextual response
```

**Note:** Reply context is handled in the backend (not via AI tool) for better performance and reliability. See [Message Reply Handling](../development/MESSAGE_REPLY_HANDLING.md) for details.

### Order Tracking Flow
```
User: "Track order #12345"
  ↓
Bot: "Verifying identity. Sending OTP..."
  ↓
Generate OTP → Store → Send via WhatsApp
  ↓
User: "123456"
  ↓
Verify OTP → Fetch Order → Send Details
```

### FAQ Flow
```
User: "What is your return policy?"
  ↓
Generate Query Embedding
  ↓
Vector Search (similarity > 0.85?)
  ↓
Yes → Return FAQ Answer
No → OpenAI General Response
```

### Escalation Flow
```
User clicks "No" (1st time) → Counter = 1
User clicks "No" (2nd time) → Counter = 2
User clicks "No" (3rd time) → Counter = 3
  ↓
Threshold Reached → Escalate
  ↓
Notify AI Sensy → Human Agent Takes Over
```

## API Endpoints (Planned)

### Webhook
- `POST /webhook` - Receive messages from AI Sensy

### Admin (Future)
- `GET /admin/faqs` - List all FAQs
- `POST /admin/faqs` - Create FAQ
- `PUT /admin/faqs/:id` - Update FAQ
- `DELETE /admin/faqs/:id` - Delete FAQ
- `POST /admin/faqs/:id/embed` - Regenerate embedding

### Analytics (Future)
- `GET /analytics/feedback` - Feedback statistics
- `GET /analytics/escalations` - Escalation metrics
- `GET /analytics/conversations` - Conversation stats

## Database Collections/Tables

1. **user_sessions** - User sessions and state (token, feedback counts, language)
2. **conversation_messages** - Recent messages (last 20 per user, auto-cleanup)
3. **feedback** - User feedback records
4. **faqs** - FAQ metadata (with AI suggestions)

**Storage Strategy:**
- Store last 20 messages per user in `conversation_messages`
- Auto-cleanup older messages (keep last 20)
- Used for context, AI FAQ suggestions, analytics
2. **feedback** - User feedback records
3. **otps** - OTP codes for order tracking
4. **faqs_metadata** - FAQ metadata (embeddings in vector DB)
5. **products** - Product catalog (if separate DB)

## Environment Variables Needed

```env
OPENAI_API_KEY=
AISENSY_API_KEY=
AISENSY_PROJECT_ID=
PINECONE_API_KEY=
DATABASE_URL=
ORDER_API_URL=
PRODUCT_API_URL=
```

## Key Decisions Needed

1. **Vector Database Choice**
   - Pinecone (recommended) - Easy, managed
   - Weaviate - Self-hosted option
   - ChromaDB - Lightweight, local

2. **Primary Database**
   - MongoDB - Document-based, flexible (chosen)

3. **Order System**
   - API integration method?
   - Authentication method?

4. **Product Catalog**
   - Database structure?
   - Search engine needed?

## Development Order

1. ✅ Basic webhook handler
2. ✅ OpenAI integration
3. ✅ Feedback mechanism
4. ✅ FAQ system
5. ✅ Order tracking
6. ✅ Product search
7. ✅ Escalation

## Testing Checklist

- [ ] Webhook receives messages correctly
- [ ] OpenAI generates appropriate responses
- [ ] Language detection works (EN/AR)
- [ ] Feedback prompt appears after each message
- [ ] Feedback tracking works
- [ ] Escalation triggers after N "No"s
- [ ] OTP generation and delivery
- [ ] OTP verification
- [ ] Order lookup after OTP verification
- [ ] FAQ search returns relevant results
- [ ] Product search by SKU
- [ ] Product search by brand
- [ ] All features work in both languages

