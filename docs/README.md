# Sundus AI Documentation

Welcome to the Sundus AI chatbot documentation. This directory contains comprehensive documentation for the WhatsApp chatbot project.

## 📚 Documentation Index

### 1. [Project Specification](./PROJECT_SPECIFICATION.md)
**Complete project specification and feasibility analysis**

- Detailed analysis of all 6 core features
- Technical implementation details
- Challenges and solutions
- Technology stack
- Implementation phases
- Security considerations
- Success metrics

**Read this first** for a complete understanding of the project.

---

### 2. [Architecture](./ARCHITECTURE.md)
**System architecture and technical design**

- High-level architecture diagrams
- Component details
- Data flow diagrams
- Database schema
- API integration points
- Security architecture
- Scalability considerations

**Read this** to understand how the system is designed and how components interact.

---

### 3. [Quick Reference](./QUICK_REFERENCE.md)
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

### 4. [Additional Features](./ADDITIONAL_FEATURES.md)
**Extended feature suggestions and recommendations**

- 15+ additional feature suggestions
- Feature priority matrix
- Implementation recommendations
- ROI estimation
- Feature dependencies

**Review this** for future enhancements and feature planning.

---

### 5. [API Reference](./API_REFERENCE.md)
**Complete API documentation for external integrations**

- Alhomaidhi Group API endpoints
- Authentication APIs (OTP)
- Product APIs (search, brands, details)
- Order APIs (list, retrieve)
- Request/response examples
- Integration flows

**Reference this** when implementing API integrations.

---

### 6. [Code Structure](./CODE_STRUCTURE.md)
**Modular code architecture and organization**

- Project structure
- Module responsibilities
- Agentic flow architecture
- Code organization principles
- How to add new tools/features
- Testing strategy

**Follow this** for clean, modular, scalable code.

---

### 7. [Guardrails & Safety](./GUARDRAILS.md)
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

---

### 8. [How It Works](./HOW_IT_WORKS.md)
**Detailed explanation of the system architecture**

- How the system works (step-by-step)
- OpenAI Function Calling vs MCP
- Complete flow diagrams
- Technology stack
- Why this architecture

**Read this** to understand exactly how everything works together.

---

### 9. [Tool Design Guide](./TOOL_DESIGN_GUIDE.md)
**How AI intelligently selects tools**

- How tool descriptions work
- Best practices for tool descriptions
- Real examples
- Common mistakes to avoid
- Testing tool selection

**Critical reading** - explains how AI knows which tool to call without extra prompts!

---

### 10. [Tools Reference](./TOOLS_REFERENCE.md)
**Complete list of all available tools**

- All 8 tools defined
- Tool purposes and use cases
- Parameters and return types
- Tool execution flows
- Implementation structure

**Reference this** when implementing tools or adding new ones.

---

### 11. [Message Sending](./MESSAGE_SENDING.md)
**How WhatsApp messages are sent (NOT an AI tool)**

- Why message sending is not a tool
- Message sending flow
- AI Sensy API integration
- Special cases (OTP, images, feedback)
- Implementation details

**Important:** Understand that sending messages is backend orchestration, not an AI tool!

---

### 12. [AI FAQ Suggestions](./AI_FAQ_SUGGESTIONS.md)
**Self-improving FAQ system with AI suggestions**

- Base FAQs (manual) vs AI-suggested FAQs
- How AI suggests FAQs from conversations
- Admin review workflow
- Continuous improvement system
- Database structure for FAQ sources and status

**Read this** to understand the self-improving FAQ system.

---

### 13. [Database Design](./DATABASE_DESIGN.md)
**MongoDB schema and database structure**

- What we store vs what we don't store
- User sessions collection
- Feedback collection
- FAQ collection (with AI suggestions)
- Indexes and optimization

**Reference this** for database schema and design decisions.

---

### 14. [Database Requirements](./DATABASE_REQUIREMENTS.md)
**Database requirements and setup**

- Required collections/tables
- What we don't need to store
- Environment variables
- Database schema overview

**Read this** to understand database requirements.

---

### 15. [FAQ Storage Explanation](./FAQ_STORAGE_EXPLANATION.md)
**How FAQs are stored in MongoDB and Pinecone**

- MongoDB metadata storage
- Pinecone vector embeddings
- How FAQ search works
- Data flow diagrams

**Read this** to understand the hybrid storage approach for FAQs.

---

### 16. [Alhomaidhi API Key Explanation](./ALHOMAIDHI_API_KEY_EXPLANATION.md)
**Why we need the ALHOMAIDHI_API_KEY**

- Public endpoints (products, brands) - uses API key
- Private endpoints (orders) - uses token from OTP
- Authentication flow

**Read this** to understand API authentication.

---

## 🚀 Quick Start

1. **Read [How It Works](./HOW_IT_WORKS.md)** - Understand the system architecture first
2. **Read [Project Specification](./PROJECT_SPECIFICATION.md)** to understand the complete project
3. **Review [Architecture](./ARCHITECTURE.md)** to understand agentic system design
4. **Study [Code Structure](./CODE_STRUCTURE.md)** for modular architecture
5. **⚠️ Read [Guardrails & Safety](./GUARDRAILS.md)** - Critical for production
6. **Use [Quick Reference](./QUICK_REFERENCE.md)** during development
7. **Check [Additional Features](./ADDITIONAL_FEATURES.md)** for future planning
8. **Reference [API Reference](./API_REFERENCE.md)** for API integrations

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
│   ├── README.md           # This file
│   ├── PROJECT_SPECIFICATION.md
│   ├── ARCHITECTURE.md      # Agentic architecture
│   ├── CODE_STRUCTURE.md    # Modular code structure
│   ├── QUICK_REFERENCE.md
│   ├── API_REFERENCE.md
│   └── ADDITIONAL_FEATURES.md
├── src/                     # Main application code (modular structure)
│   ├── app.ts              # Express server
│   ├── handlers/           # Request handlers
│   ├── agent/              # AI agent & tools
│   ├── services/           # Business logic
│   ├── api/                # API clients
│   ├── models/             # Data models
│   ├── repositories/       # Database operations
│   └── utils/              # Utilities
├── mock_server/            # Mock webhook server for testing
│   ├── src/
│   └── WEBHOOK_DOCUMENTATION.md
└── webhook_responses/      # Example webhook payloads
```

## 🔑 Key Decisions

### ✅ Resolved
1. **Architecture Approach** ✅
   - ✅ Agentic approach with OpenAI function calling
   - ✅ Modular code structure (one file per operation)
   - See [Code Structure](./CODE_STRUCTURE.md)

2. **Order System Integration** ✅
   - ✅ API endpoints confirmed
   - ✅ Authentication method (OTP) confirmed
   - See [API Reference](./API_REFERENCE.md)

3. **Product Catalog** ✅
   - ✅ API endpoints confirmed
   - ✅ Search implementation confirmed
   - See [API Reference](./API_REFERENCE.md)

### ⚠️ Pending
1. **AI Sensy Agent Handover**
   - API documentation
   - Integration method

### ✅ Resolved
1. **Database Choice** ✅
   - MongoDB - Primary database (user sessions, feedback, FAQ metadata)
   - Pinecone - Vector database (FAQ embeddings)

2. **Vector Database Choice** ✅
   - Pinecone - Chosen for FAQ semantic search

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
- [API Reference](./API_REFERENCE.md) - Alhomaidhi Group API documentation

## 📞 Questions?

Refer to the "Questions to Resolve" section in [Project Specification](./PROJECT_SPECIFICATION.md) for items that need clarification before implementation.

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

