# FAQ + Pinecone Integration Plan

## Overview

This plan outlines how to integrate Pinecone FAQ semantic search into the existing agent system. The integration will enable the AI to search FAQs using semantic search when users ask questions.

---

## Architecture Flow

```
User Message: "What's your return policy?"
    ↓
AI Agent (OpenAI) decides to call: search_faqs("return policy")
    ↓
Tool Executor Router → FAQ Executor
    ↓
FAQ Service → Pinecone Service (semantic search)
    ↓
Pinecone returns: [{ _id: "faq123", _score: 0.92, fields: {...} }]
    ↓
FAQ Service → FAQ Repository (MongoDB) → Get full FAQ details
    ↓
FAQ Executor formats result for AI
    ↓
AI formats final response: "According to our return policy: [FAQ answer]"
    ↓
Send to user via WhatsApp
```

---

## Files to Create

### 1. **FAQ Repository** (`src/repositories/faq.repository.ts`)
**Purpose:** MongoDB operations for FAQ metadata

**Methods:**
- `findById(id: string): Promise<FAQ | null>` - Get FAQ by ID
- `findByIds(ids: string[]): Promise<FAQ[]>` - Get multiple FAQs by IDs
- `findActive(): Promise<FAQ[]>` - Get all active FAQs
- `create(createData: CreateFAQDto): Promise<FAQ>` - Create new FAQ
- `update(id: string, updateData: Partial<FAQ>): Promise<FAQ>` - Update FAQ
- `delete(id: string): Promise<void>` - Delete FAQ
- `incrementUsage(id: string): Promise<void>` - Increment usage count
- `updateLastUsed(id: string): Promise<void>` - Update last used timestamp

**Why:** Need to fetch FAQ details (question, answer, answer_ar) from MongoDB after Pinecone search returns IDs.

---

### 2. **FAQ Service** (`src/services/faq.service.ts`)
**Purpose:** Business logic layer between executor and Pinecone/MongoDB

**Methods:**
- `searchFAQs(query: string, topK?: number): Promise<FAQSearchResult>` - Main search method
- `formatFAQForAI(faq: FAQ, language?: 'en' | 'ar'): string` - Format FAQ for AI response
- `prepareFAQForPinecone(faq: FAQ): FAQRecord` - Convert FAQ to Pinecone record format
- `syncFAQToPinecone(faq: FAQ): Promise<void>` - Upsert FAQ to Pinecone
- `removeFAQFromPinecone(faqId: string): Promise<void>` - Delete FAQ from Pinecone

**Key Logic:**
- Search Pinecone → Get IDs and scores
- Fetch full FAQ details from MongoDB using IDs
- Filter by `is_active: true` and `status: 'active'`
- Format results for AI
- Handle language preference (EN/AR)

**Why:** Bridges executor and data layers, handles formatting and business logic.

---

### 3. **FAQ Tool Definition** (`src/agent/tools/faq.tools.ts`)
**Purpose:** Define `search_faqs` tool for AI agent

**Tool:**
```typescript
{
  type: "function",
  function: {
    name: "search_faqs",
    description: "Search the FAQ database for answers to common questions about policies, procedures, shipping, returns, and general information. Use this when user asks about company policies, how to do something, general questions, or wants information about procedures.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The user's question or search query"
        }
      },
      required: ["query"]
    }
  }
}
```

**Why:** AI needs tool definition to know when to call FAQ search.

---

### 4. **FAQ Executor** (`src/agent/executor/faq.executor.ts`)
**Purpose:** Execute FAQ tool calls from AI

**Interface:**
```typescript
export interface FAQToolResult {
  success: boolean;
  result: string | null;  // Formatted FAQ answer or null if no match
  error?: string;
  faqs?: FAQ[];  // Found FAQs (for metadata)
}
```

**Method:**
- `executeFAQTool(toolName: string, args: any): Promise<FAQToolResult>`

**Logic:**
- Validate `query` parameter
- Call `faqService.searchFAQs(query)`
- If FAQs found: Format and return
- If no FAQs found: Return null (AI will generate general response)
- Handle errors gracefully

**Why:** Executes FAQ tool when AI calls it, similar to product/order executors.

---

## Files to Modify

### 1. **Tool Registry** (`src/agent/tools/index.ts`)
**Changes:**
- Import FAQ tools: `import { faqTools } from "./faq.tools.js";`
- Add to `allTools` array: `...faqTools`
- Add to `getToolsByCategory`: `faqs: faqTools`

**Why:** Register FAQ tools so AI can use them.

---

### 2. **Tool Executor Router** (`src/agent/executor/index.ts`)
**Changes:**
- Import FAQ executor: `import { executeFAQTool } from "./faq.executor.js";`
- Add routing logic:
  ```typescript
  else if (name === "search_faqs") {
    const faqResult = await executeFAQTool(name, args);
    
    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: faqResult.success 
        ? (faqResult.result || JSON.stringify({ message: "No relevant FAQ found" }))
        : JSON.stringify({ error: faqResult.error || "FAQ search failed" })
    };
  }
  ```

**Why:** Route FAQ tool calls to FAQ executor.

---

### 3. **System Prompt** (Optional - in `src/services/webhook/handlers/text-message.handler.ts`)
**Changes:**
- Add FAQ capability description to system prompt:
  ```
  - Answer questions using our FAQ database when available
  - Use search_faqs tool when users ask about policies, procedures, or general information
  ```

**Why:** Help AI understand when to use FAQ search.

---

## Data Flow Details

### Search Flow

1. **User asks question:**
   ```
   "What's your return policy?"
   ```

2. **AI decides to call tool:**
   ```json
   {
     "name": "search_faqs",
     "arguments": "{\"query\": \"return policy\"}"
   }
   ```

3. **FAQ Executor receives call:**
   - Validates query
   - Calls `faqService.searchFAQs("return policy")`

4. **FAQ Service:**
   - Calls `pineconeService.searchFAQs("return policy", 5)`
   - Pinecone returns: `[{ _id: "faq123", _score: 0.92, fields: {...} }]`
   - Calls `faqRepository.findByIds(["faq123"])` to get full FAQ details
   - Filters: Only `is_active: true` and `status: 'active'`
   - Formats: `"According to our return policy: [answer]"`

5. **FAQ Executor returns:**
   ```typescript
   {
     success: true,
     result: "According to our return policy: You can return items within 30 days..."
   }
   ```

6. **AI formats final response:**
   ```
   "According to our return policy: You can return items within 30 days of purchase..."
   ```

7. **Send to user via WhatsApp**

---

### FAQ Creation/Update Flow (Future)

When admin creates/updates FAQ:

1. **Store in MongoDB:**
   - Create/update FAQ document
   - Set `vector_id` to FAQ `_id`

2. **Sync to Pinecone:**
   - Call `faqService.prepareFAQForPinecone(faq)` to format
   - Call `pineconeService.upsertFAQs([faqRecord])`
   - Pinecone automatically generates embeddings

3. **Update MongoDB:**
   - Set `vector_id: faq._id` (already done)

---

## Integration Points

### 1. **Pinecone Service** ✅ (Already implemented)
- `searchFAQs(query: string, topK?: number): Promise<FAQSearchResult[]>`
- `upsertFAQs(records: FAQRecord[]): Promise<void>`
- `deleteFAQs(ids: string[]): Promise<void>`

### 2. **FAQ Model** ✅ (Already exists)
- `FAQ` interface with all required fields
- `CreateFAQDto`, `AISuggestedFAQDto`, `ReviewFAQDto`

### 3. **Agent System** ✅ (Already exists)
- Tool registry system
- Executor router
- OpenAI service with tool calling

### 4. **Database** ✅ (Already configured)
- MongoDB connection
- Indexes for FAQs collection

---

## Dependencies

### Required Services/Repositories:
- ✅ `pineconeService` - Already implemented
- ❌ `faqRepository` - **Need to create**
- ❌ `faqService` - **Need to create**

### Required Tools/Executors:
- ❌ `faqTools` - **Need to create**
- ❌ `faqExecutor` - **Need to create**

### Required Config:
- ✅ `pineconeConfig` - Already configured
- ✅ Environment variables - Already documented

---

## Implementation Order

### Phase 1: Data Layer
1. ✅ **Pinecone Service** - Already done
2. ❌ **FAQ Repository** - Create MongoDB operations
3. ❌ **FAQ Service** - Create business logic layer

### Phase 2: Agent Integration
4. ❌ **FAQ Tool Definition** - Create tool for AI
5. ❌ **FAQ Executor** - Create executor
6. ❌ **Tool Registry Update** - Register FAQ tools
7. ❌ **Executor Router Update** - Route FAQ calls

### Phase 3: Testing & Refinement
8. Test FAQ search flow
9. Test with various queries
10. Verify language support (EN/AR)
11. Test error handling

---

## Key Design Decisions

### 1. **Hybrid Storage (MongoDB + Pinecone)**
- **MongoDB:** Stores FAQ metadata (question, answer, category, status)
- **Pinecone:** Stores vector embeddings for semantic search
- **Link:** `vector_id` in MongoDB = `_id` in Pinecone

### 2. **Integrated Embeddings**
- Pinecone handles embeddings automatically (no OpenAI embeddings needed)
- FAQ records must have `content` field (question + answer combined)
- Pinecone uses `llama-text-embed-v2` model

### 3. **Search Strategy**
- Use Pinecone semantic search with reranking
- Filter by similarity threshold (0.75 default)
- Fetch full FAQ details from MongoDB after search
- Filter by `is_active: true` and `status: 'active'`

### 4. **Language Support**
- Store both `answer` (EN) and `answer_ar` (AR) in MongoDB
- FAQ Service formats answer based on user language preference
- Pinecone search works for both languages (semantic search)

### 5. **Error Handling**
- If Pinecone search fails: Return null, let AI generate response
- If no FAQs found: Return null, let AI generate response
- If FAQ not active: Filter out, continue with other results
- Log all errors for debugging

---

## Environment Variables

Already configured:
```bash
PINECONE_API_KEY=your-api-key
PINECONE_INDEX_NAME=sundus-faqs
PINECONE_NAMESPACE=faqs
PINECONE_SIMILARITY_THRESHOLD=0.75
PINECONE_DEFAULT_TOP_K=5
```

---

## Testing Checklist

### Unit Tests:
- [ ] FAQ Repository: CRUD operations
- [ ] FAQ Service: Search, format, sync
- [ ] FAQ Executor: Tool execution
- [ ] Pinecone Service: Search, upsert, delete

### Integration Tests:
- [ ] Full search flow: User query → AI → Tool → Pinecone → MongoDB → Response
- [ ] Language support: EN and AR answers
- [ ] Error handling: No FAQs found, Pinecone error, MongoDB error
- [ ] Active/Inactive filtering

### E2E Tests:
- [ ] User asks FAQ question → Gets FAQ answer
- [ ] User asks non-FAQ question → Gets AI-generated response
- [ ] Multiple FAQs found → Returns best match
- [ ] No FAQs found → AI generates response

---

## Future Enhancements

### 1. **FAQ Management API** (Future)
- Admin API to create/update/delete FAQs
- Auto-sync to Pinecone on create/update
- Auto-delete from Pinecone on delete

### 2. **AI FAQ Suggestions** (Future)
- Analyze conversations to suggest new FAQs
- Store as `source: 'ai_suggested'`, `status: 'pending_review'`
- Admin reviews and approves/rejects

### 3. **Usage Analytics** (Future)
- Track which FAQs are used most
- Update `usage_count` and `last_used_at`
- Analytics dashboard for admins

### 4. **Category Filtering** (Future)
- Allow searching within specific categories
- Add category filter to search

---

## Summary

### What We're Building:
1. **FAQ Repository** - MongoDB operations
2. **FAQ Service** - Business logic + Pinecone integration
3. **FAQ Tool** - AI tool definition
4. **FAQ Executor** - Tool execution
5. **Integration** - Register tools and route calls

### What's Already Done:
- ✅ Pinecone Service (fully implemented)
- ✅ FAQ Model (TypeScript interfaces)
- ✅ Agent system (tool calling infrastructure)
- ✅ Database configuration

### Estimated Implementation:
- **Files to create:** 4 files
- **Files to modify:** 2 files
- **Time estimate:** 2-3 hours

---

## Next Steps

Once you approve this plan, I will:

1. Create FAQ Repository
2. Create FAQ Service
3. Create FAQ Tool Definition
4. Create FAQ Executor
5. Update Tool Registry
6. Update Executor Router
7. Test the integration

Ready to proceed? 🚀

