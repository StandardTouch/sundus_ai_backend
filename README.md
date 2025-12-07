# Sundus AI - WhatsApp Chatbot Backend

AI-powered WhatsApp chatbot for Alhomaidhi Group, built with TypeScript, OpenAI, and AI Sensy.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## 📚 Documentation

**All documentation is in the [`docs/`](./docs/) directory.**

Start here: **[docs/README.md](./docs/README.md)**

### Key Documentation Files

- **[Project Specification](./docs/PROJECT_SPECIFICATION.md)** - Complete project overview
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design
- **[How It Works](./docs/HOW_IT_WORKS.md)** - Detailed system flow
- **[Code Structure](./docs/CODE_STRUCTURE.md)** - Modular code organization
- **[API Reference](./docs/API_REFERENCE.md)** - External API documentation
- **[Database Design](./docs/DATABASE_DESIGN.md)** - MongoDB schema

## 🏗️ Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **AI/LLM:** OpenAI GPT-4 (Function Calling)
- **WhatsApp API:** AI Sensy
- **Database:** MongoDB (user sessions, feedback, FAQ metadata)
- **Vector DB:** Pinecone (FAQ embeddings for semantic search)
- **External APIs:** Alhomaidhi Group API

## 📁 Project Structure

```
sundus_ai_backend/
├── docs/                    # All documentation
│   └── README.md           # Documentation index
├── src/                     # Main application code
│   ├── app.ts              # Express server
│   ├── handlers/           # Request handlers
│   ├── agent/              # AI agent & tools
│   ├── services/           # Business logic
│   ├── api/                # API clients
│   ├── models/             # Data models
│   ├── repositories/       # Database operations
│   ├── guardrails/         # Safety mechanisms
│   └── utils/              # Utilities
├── mock_server/            # Mock webhook server for testing
└── webhook_responses/      # Example webhook payloads
```

## 🔑 Environment Variables

See [docs/DATABASE_REQUIREMENTS.md](./docs/DATABASE_REQUIREMENTS.md) for complete list.

**Required:**
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key
- `AISENSY_API_KEY` - AI Sensy API key
- `AISENSY_PROJECT_ID` - AI Sensy project ID
- `PINECONE_API_KEY` - Pinecone API key
- `ALHOMAIDHI_API_KEY` - Alhomaidhi Group API key

## ✨ Features

- ✅ Smart multilingual responses (English/Arabic)
- ✅ Feedback mechanism ("Was this helpful?")
- ✅ Human agent escalation
- ✅ Order tracking with OTP authentication
- ✅ FAQ system with AI suggestions
- ✅ Product search (SKU/Brand)

## 📖 Getting Started

1. Read [docs/README.md](./docs/README.md) for complete documentation
2. Review [docs/HOW_IT_WORKS.md](./docs/HOW_IT_WORKS.md) to understand the system
3. Check [docs/CODE_STRUCTURE.md](./docs/CODE_STRUCTURE.md) for code organization
4. See [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) for API integrations

## 🔒 Security

See [docs/GUARDRAILS.md](./docs/GUARDRAILS.md) for comprehensive security and safety measures.

## 📝 License

[Add your license here]

---

**For complete documentation, see the [`docs/`](./docs/) directory.**

