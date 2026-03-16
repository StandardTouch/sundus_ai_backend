# Sundus AI Documentation

Welcome to the Sundus AI chatbot documentation. This directory contains comprehensive documentation organized by category.

## 📚 Documentation Structure

```
docs/
├── getting-started/     # Start here
├── architecture/        # System design
├── database/            # Database docs
├── apis/                # API documentation
├── features/            # Feature documentation
├── development/         # Development guides
└── operations/          # Operations & maintenance
```

---

## 🚀 Getting Started

### 1. [Project Specification](./getting-started/PROJECT_SPECIFICATION.md)
**Complete project specification and feasibility analysis**

- Detailed analysis of all 6 core features
- Technical implementation details
- Challenges and solutions
- Technology stack
- Implementation phases
- Security considerations
- Success metrics

**Read this first** for a complete understanding of the project.

### 2. [Quick Reference](./getting-started/QUICK_REFERENCE.md)
**Quick reference guide for development**

- Feature summary table
- Core requirements checklist
- Message flow examples
- API endpoints
- Database collections
- Environment variables
- Testing checklist

**Use this** as a quick reference during development.

---

## 🏗️ Architecture

### 3. [Architecture](./architecture/ARCHITECTURE.md)
**System architecture and technical design**

- High-level architecture diagrams
- Component details
- Data flow diagrams
- Database schema
- API integration points
- Security architecture
- Scalability considerations

**Read this** to understand how the system is designed and how components interact.

### 4. [How It Works](./architecture/HOW_IT_WORKS.md)
**Detailed explanation of the system architecture**

- How the system works (step-by-step)
- OpenAI Function Calling vs MCP
- Complete flow diagrams
- Technology stack
- Why this architecture

**Read this** to understand exactly how everything works together.

### 5. [Code Structure](./architecture/CODE_STRUCTURE.md)
**Modular code architecture and organization**

- Project structure
- Module responsibilities
- Agentic flow architecture
- Code organization principles
- How to add new tools/features
- Testing strategy

**Follow this** for clean, modular, scalable code.

---

## 💾 Database

### 6. [Database Design](./database/DATABASE_DESIGN.md)
**MongoDB schema and database structure**

- What we store vs what we don't store
- User sessions collection
- Conversation messages collection (recent messages)
- Feedback collection
- FAQ collection (with AI suggestions)
- Indexes and optimization

**Reference this** for database schema and design decisions.

### 6.5. [Conversation Storage Analysis](./database/CONVERSATION_STORAGE_ANALYSIS.md)
**Should we store conversation history?**

- Comparison: Store vs Don't Store vs Hybrid
- Pros and cons of each approach
- Recommendation for Sundus AI
- Implementation examples

**Read this** to understand the conversation storage decision.

### 7. [Database Requirements](./database/DATABASE_REQUIREMENTS.md)
**Database requirements and setup**

- Required collections/tables
- What we don't need to store
- Environment variables
- Database schema overview

**Read this** to understand database requirements.

### 8. [FAQ Storage Explanation](./database/FAQ_STORAGE_EXPLANATION.md)
**How FAQs are stored in MongoDB and Pinecone**

- MongoDB metadata storage
- Pinecone vector embeddings
- How FAQ search works
- Data flow diagrams

**Read this** to understand the hybrid storage approach for FAQs.

---

## 🔌 APIs

### 9. [API Reference](./apis/API_REFERENCE.md)
**Complete API documentation for external integrations**

- Alhomaidhi Group API endpoints
- Authentication APIs (OTP)
- Product APIs (search, brands, details)
- Order APIs (list, retrieve)
- Request/response examples
- Integration flows

**Reference this** when implementing API integrations.

### 10. [Alhomaidhi API Key Explanation](./apis/ALHOMAIDHI_API_KEY_EXPLANATION.md)
**Why we need the ALHOMAIDHI_API_KEY**

- Public endpoints (products, brands) - uses API key
- Private endpoints (orders) - uses token from OTP
- Authentication flow

**Read this** to understand API authentication.

### 11. [Webhook Documentation](./apis/WEBHOOK_DOCUMENTATION.md)
**AI Sensy webhook payload structure**

- Complete webhook payload documentation
- Message types and formats
- Event handling

**Reference this** for webhook integration.

---

## ✨ Features

### 12. [AI FAQ Suggestions](./features/AI_FAQ_SUGGESTIONS.md)
**Self-improving FAQ system with AI suggestions**

- Base FAQs (manual) vs AI-suggested FAQs
- How AI suggests FAQs from conversations
- Admin review workflow
- Continuous improvement system
- Database structure for FAQ sources and status

**Read this** to understand the self-improving FAQ system.

### 13. [Message Sending](./features/MESSAGE_SENDING.md)
**How WhatsApp messages are sent (NOT an AI tool)**

- Why message sending is not a tool
- Message sending flow
- AI Sensy API integration
- Special cases (OTP, images, feedback)
- Implementation details

**Important:** Understand that sending messages is backend orchestration, not an AI tool!

### 13.5. [Locations](./features/LOCATIONS.md)
**Nearest branch search, timings, and contact numbers**

- Location tool (`search_locations`) behavior
- WhatsApp LOCATION pin handling (nearest-first sorting)
- Timings (“open now” in Saudi time)
- Phones (branch + manager)

### 14. [Additional Features](./features/ADDITIONAL_FEATURES.md)
**Extended feature suggestions and recommendations**

- 15+ additional feature suggestions
- Feature priority matrix
- Implementation recommendations
- ROI estimation
- Feature dependencies

**Review this** for future enhancements and feature planning.

---

## 🛠️ Development

### 15. [Guardrails & Safety](./development/GUARDRAILS.md)
**Comprehensive guardrails and safety mechanisms**

- Content moderation
- Prompt injection prevention
- Tool call validation
- Input/output validation
- Rate limiting
- Token management
- Error handling
- Authentication guardrails

**Critical reading** for production deployment.

### 16. [Tool Design Guide](./development/TOOL_DESIGN_GUIDE.md)
**How AI intelligently selects tools**

- How tool descriptions work
- Best practices for tool descriptions
- Real examples
- Common mistakes to avoid
- Testing tool selection

**Critical reading** - explains how AI knows which tool to call without extra prompts!

### 17. [Tools Reference](./development/TOOLS_REFERENCE.md)
**Complete list of all available tools**

- All 8 tools defined
- Tool purposes and use cases
- Parameters and return types
- Tool execution flows
- Implementation structure

**Reference this** when implementing tools or adding new ones.

### 18. [Message Reply Handling](./development/MESSAGE_REPLY_HANDLING.md)
**How to handle message replies and context**

- Backend pre-fetching approach (recommended)
- AI tool approach (alternative)
- Implementation examples
- Best practices

**Read this** to understand how reply context is handled.

---

## 🔧 Operations

### 19. [Logging](./operations/LOGGING.md)
**Logging system and monitoring**

- How to check logs in production
- Log levels and configuration
- File logging setup
- Monitoring and troubleshooting

**Read this** for production logging and monitoring.

---

## 📋 Core Features Summary

| Feature | Status | Priority |
|---------|--------|----------|
| Smart Multilingual Responses (EN/AR) | ✅ Feasible | High |
| Feedback Mechanism ("Was this helpful?") | ✅ Feasible | High |
| Human Agent Escalation | ✅ Feasible | High |
| Order Tracking with OTP | ✅ Feasible | High |
| FAQ System (Vector DB) | ✅ Feasible | Medium |
| Product Search (SKU/Brand) | ✅ Feasible | Medium |

## 🏗️ Project Structure

```
sundus_ai_backend/
├── docs/                    # Documentation (this folder)
│   ├── getting-started/     # Start here
│   ├── architecture/        # System design
│   ├── database/            # Database docs
│   ├── apis/                # API documentation
│   ├── features/            # Feature docs
│   ├── development/         # Dev guides
│   └── operations/          # Operations
├── src/                     # Main application code
│   ├── app.ts              # Express server
│   ├── handlers/           # Request handlers
│   ├── agent/              # AI agent & tools
│   ├── services/           # Business logic
│   ├── api/                # API clients
│   ├── models/             # Data models
│   ├── repositories/       # Database operations
│   └── utils/              # Utilities
├── mock_server/            # Mock webhook server
└── webhook_responses/      # Example webhook payloads
```

## 🔑 Key Decisions

### ✅ Resolved
1. **Architecture Approach** ✅
   - ✅ Agentic approach with OpenAI function calling
   - ✅ Modular code structure (one file per operation)
   - See [Code Structure](./architecture/CODE_STRUCTURE.md)

2. **Database Choice** ✅
   - MongoDB - Primary database (user sessions, feedback, FAQ metadata)
   - Pinecone - Vector database (FAQ embeddings)

3. **Order System Integration** ✅
   - ✅ API endpoints confirmed
   - ✅ Authentication method (OTP) confirmed
   - See [API Reference](./apis/API_REFERENCE.md)

4. **Product Catalog** ✅
   - ✅ API endpoints confirmed
   - ✅ Search implementation confirmed
   - See [API Reference](./apis/API_REFERENCE.md)

### ⚠️ Pending
1. **AI Sensy Agent Handover**
   - API documentation
   - Integration method

## 📝 Next Steps

1. **Research & Planning**
   - [ ] Verify AI Sensy agent handover API
   - [x] Identify order system integration ✅
   - [x] Identify product catalog system ✅
   - [ ] Set up vector database account

2. **Development Setup**
   - [ ] Initialize project structure
   - [ ] Set up TypeScript configuration
   - [ ] Configure environment variables
   - [ ] Set up database connections

3. **Begin Implementation**
   - [ ] Phase 1: Foundation (Week 1-2)
   - [ ] Phase 2: Core Features (Week 3-4)
   - [ ] Continue with subsequent phases

## 🔗 Related Documentation

- [AI Sensy Webhook Documentation](../mock_server/WEBHOOK_DOCUMENTATION.md) - Complete webhook structure
- [Mock Server README](../mock_server/README.md) - Testing webhook server

---

_Last Updated: [Current Date]_
_Version: 1.0.0_
