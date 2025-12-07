# FAQ Storage Architecture

## Where FAQs Are Stored

### MongoDB: FAQ Metadata ✅

**Stores:**
- Question text (English)
- Answer text (English)
- Answer text (Arabic) - optional
- Category
- Vector ID (link to Pinecone)
- Active/inactive status
- Timestamps

**Purpose:**
- Human-readable FAQ data
- Easy to query/update
- Admin management
- Return answers to users

### Pinecone: Vector Embeddings ✅

**Stores:**
- Vector embeddings (numerical representation)
- Generated from FAQ question + answer
- Used for semantic search

**Purpose:**
- Fast similarity search
- Find relevant FAQs by meaning
- Not by exact keyword match

## How It Works

### 1. Adding a New FAQ

```
Admin adds FAQ:
  Question: "What's your return policy?"
  Answer: "30 days return policy..."
  Answer AR: "سياسة الإرجاع 30 يوم..."
    ↓
1. Store in MongoDB:
   {
     _id: "faq123",
     question: "What's your return policy?",
     answer: "30 days return policy...",
     answer_ar: "سياسة الإرجاع 30 يوم...",
     category: "policies",
     vector_id: "",  // Will be set after embedding
     is_active: true
   }
    ↓
2. Generate embedding (OpenAI):
   - Combine: question + answer
   - Call OpenAI embeddings API
   - Get vector: [0.123, -0.456, 0.789, ...]
    ↓
3. Store in Pinecone:
   - ID: "faq123" (same as MongoDB _id)
   - Vector: [0.123, -0.456, 0.789, ...]
   - Metadata: { category: "policies" }
    ↓
4. Update MongoDB:
   - Set vector_id: "faq123"
```

### 2. Searching FAQs

```
User asks: "How do I return an item?"
    ↓
1. Generate query embedding:
   - Call OpenAI embeddings API
   - Get vector: [0.111, -0.222, 0.333, ...]
    ↓
2. Search Pinecone:
   - Find similar vectors
   - Return top 3 matches with similarity scores
   - Example:
     - faq123: 0.92 (very similar!)
     - faq456: 0.75
     - faq789: 0.68
    ↓
3. Check similarity threshold:
   - If top match > 0.85: Use FAQ answer
   - Else: Use OpenAI general response
    ↓
4. Get FAQ details from MongoDB:
   - Use vector_id (faq123) to get full FAQ
   - Return answer (EN or AR based on user language)
```

## Data Flow

```
┌─────────────────────────────────────────┐
│         Admin Adds FAQ                 │
└──────────────────┬──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         MongoDB (Metadata)              │
│  • Question                              │
│  • Answer (EN/AR)                        │
│  • Category                              │
│  • vector_id (empty initially)          │
└──────────────────┬──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Generate Embedding (OpenAI)        │
│  • Combine question + answer             │
│  • Call embeddings API                   │
│  • Get vector: [0.123, -0.456, ...]      │
└──────────────────┬──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Pinecone (Vectors)              │
│  • ID: "faq123"                         │
│  • Vector: [0.123, -0.456, ...]         │
│  • Metadata: { category: "policies" }   │
└──────────────────┬──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Update MongoDB                     │
│  • Set vector_id: "faq123"              │
└─────────────────────────────────────────┘
```

## Why Both?

### MongoDB (Metadata)
- ✅ Human-readable data
- ✅ Easy to query/update
- ✅ Store multilingual answers
- ✅ Admin-friendly
- ✅ Return formatted answers

### Pinecone (Embeddings)
- ✅ Fast semantic search
- ✅ Find by meaning, not keywords
- ✅ Handles variations in questions
- ✅ Similarity scoring

## FAQ Search Flow

```
User: "How do I return something?"
    ↓
1. Generate query embedding (OpenAI)
   Vector: [0.111, -0.222, 0.333, ...]
    ↓
2. Search Pinecone
   Find similar vectors
   Top match: faq123 (similarity: 0.92)
    ↓
3. Get FAQ from MongoDB
   Use vector_id "faq123"
   Return: "30 days return policy..."
    ↓
4. Return to user
   (in user's language: EN or AR)
```

## Summary

| Data | Stored In | Purpose |
|------|-----------|---------|
| FAQ Question | MongoDB | Human-readable |
| FAQ Answer (EN/AR) | MongoDB | Return to users |
| FAQ Category | MongoDB | Organization |
| FAQ Source (manual/ai_suggested) | MongoDB | Track how FAQ was created |
| FAQ Status (active/pending/rejected) | MongoDB | Review workflow |
| AI Suggestion Details | MongoDB | Track AI suggestions |
| Usage Statistics | MongoDB | Analytics |
| Vector Embedding | Pinecone | Semantic search |
| Vector ID | MongoDB | Link to Pinecone |

**Both are needed:**
- MongoDB = Content (what to show users) + Metadata (source, status, usage)
- Pinecone = Search (how to find relevant FAQs)

**See:** [AI FAQ Suggestions](../features/AI_FAQ_SUGGESTIONS.md) for complete AI suggestion system

