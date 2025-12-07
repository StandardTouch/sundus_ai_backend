# AI-Powered FAQ Suggestions

## Overview

Sundus AI has a **self-improving FAQ system** that:
1. **Base FAQs** - Manually added by admins
2. **AI-Suggested FAQs** - Generated from conversations
3. **Admin Review** - Admins approve/reject AI suggestions
4. **Continuous Improvement** - System learns from conversations

---

## How It Works

### 1. Base FAQs (Manual)

**Admin adds FAQs:**
- Question and answer (EN/AR)
- Category
- Immediately active
- Source: `manual`

### 2. AI-Suggested FAQs (Automatic)

**AI analyzes conversations and suggests FAQs:**

```
User asks: "What's your return policy?"
    ↓
AI responds with answer
    ↓
AI detects: This question might be common
    ↓
AI suggests FAQ:
  Question: "What's your return policy?"
  Answer: [AI's response]
  Confidence: 0.85
    ↓
Store in MongoDB:
  source: "ai_suggested"
  status: "pending_review"
    ↓
Admin reviews in admin panel
    ↓
Admin approves → status: "active"
Admin rejects → status: "rejected"
```

### 3. Continuous Improvement

**System learns:**
- Tracks which FAQs are used most
- Identifies patterns in user questions
- Suggests new FAQs based on:
  - Frequently asked questions
  - Questions with high similarity
  - Questions that current FAQs don't cover well

---

## Database Structure

### FAQ Collection (MongoDB)

```typescript
interface FAQ {
  _id: ObjectId;
  
  // Content
  question: string;
  answer: string;
  answer_ar?: string;
  category?: string;
  
  // Vector Search
  vector_id: string;  // Pinecone ID
  
  // Source & Status
  source: 'manual' | 'ai_suggested';
  status: 'active' | 'pending_review' | 'rejected';
  
  // AI Suggestion Details
  ai_suggestion?: {
    source_conversation_id?: string;  // Which conversation triggered this
    source_message_id?: string;        // Which message triggered this
    confidence_score?: number;        // AI confidence (0-1)
    suggested_at: Date;
    reviewed_by?: string;             // Admin username
    reviewed_at?: Date;
    review_notes?: string;            // Admin comments
  };
  
  // Usage Statistics
  usage_count: number;                // Times this FAQ was returned
  last_used_at?: Date;
  
  // Metadata
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## FAQ Lifecycle

### Manual FAQ
```
Admin adds FAQ
  ↓
source: "manual"
status: "active"
  ↓
Immediately available
  ↓
Embedding generated → Stored in Pinecone
```

### AI-Suggested FAQ
```
AI detects common question
  ↓
AI generates FAQ suggestion
  ↓
source: "ai_suggested"
status: "pending_review"
  ↓
Admin reviews in admin panel
  ↓
Admin approves:
  status: "active"
  Embedding generated → Stored in Pinecone
  ↓
Available for users

OR

Admin rejects:
  status: "rejected"
  (Not used, but kept for analytics)
```

---

## AI Suggestion Logic

### When AI Suggests FAQs

**Triggers:**
1. **Frequently Asked Questions**
   - Same/similar question asked multiple times
   - Analyzed from stored conversation messages (last 20 per user)
   - Threshold: 3+ times in X days

2. **High Confidence Responses**
   - AI gives detailed answer
   - User provides positive feedback
   - Question not covered by existing FAQs
   - Analyzed from stored conversation messages

3. **Gap Detection**
   - User asks question
   - No existing FAQ matches well (similarity < 0.85)
   - AI provides good answer
   - User gives positive feedback
   - Detected from stored conversation messages

**Data Source:**
- AI analyzes stored conversation messages (last 20 per user)
- Messages stored in `conversation_messages` collection
- Enables pattern detection and FAQ suggestions

### Suggestion Process

```typescript
// After AI responds to user
async function analyzeForFAQ(
  phoneNumber: string,
  userMessage: string, 
  aiResponse: string, 
  feedback?: 'yes' | 'no'
) {
  // Load recent conversation messages (last 20)
  const recentMessages = await conversationMessageRepository.getRecentMessages(phoneNumber, 20);
  
  // 1. Check if question is frequently asked (from stored messages)
  const similarQuestions = await findSimilarQuestions(userMessage, recentMessages);
  if (similarQuestions.length >= 3) {
    // Suggest FAQ
    await suggestFAQ({
      question: userMessage,
      answer: aiResponse,
      confidence: 0.9,
      source_conversation_id: phoneNumber,
      source_message_id: messageId
    });
  }
  
  // 2. Check if no existing FAQ matches
  const faqMatch = await searchFAQs(userMessage);
  if (faqMatch.similarity < 0.85 && feedback === 'yes') {
    // AI answered well, but no FAQ exists
    await suggestFAQ({
      question: userMessage,
      answer: aiResponse,
      confidence: 0.8,
      source_conversation_id: phoneNumber,
      source_message_id: messageId
    });
  }
}
```

**Data Source:**
- AI analyzes stored conversation messages (last 20 per user)
- Messages stored in `conversation_messages` collection
- Enables pattern detection and FAQ suggestions

---

## Admin Panel Features

### FAQ Management

**View FAQs:**
- All FAQs (active, pending, rejected)
- Filter by source (manual, AI-suggested)
- Filter by status
- Sort by usage count

**Review AI Suggestions:**
- List pending suggestions
- View source conversation
- View confidence score
- Edit question/answer before approving
- Approve or reject

**Analytics:**
- Most used FAQs
- AI suggestion acceptance rate
- FAQ coverage (what questions aren't covered)

---

## Implementation Flow

### 1. AI Suggests FAQ

```typescript
// After AI responds to user
async function processConversationForFAQ(
  userMessage: string,
  aiResponse: string,
  conversationId: string,
  messageId: string,
  feedback?: 'yes' | 'no'
) {
  // Check if should suggest FAQ
  const shouldSuggest = await shouldSuggestFAQ(userMessage, aiResponse, feedback);
  
  if (shouldSuggest) {
    await createAISuggestedFAQ({
      question: userMessage,
      answer: aiResponse,
      source_conversation_id: conversationId,
      source_message_id: messageId,
      confidence_score: calculateConfidence(userMessage, aiResponse, feedback)
    });
  }
}
```

### 2. Admin Reviews

```typescript
// Admin panel endpoint
async function reviewFAQ(faqId: string, action: 'approve' | 'reject', notes?: string) {
  const faq = await FAQRepository.findById(faqId);
  
  if (action === 'approve') {
    // Generate embedding
    const embedding = await generateEmbedding(faq.question + faq.answer);
    
    // Store in Pinecone
    await pinecone.upsert({
      id: faq._id.toString(),
      values: embedding,
      metadata: { category: faq.category }
    });
    
    // Update MongoDB
    await FAQRepository.update(faqId, {
      status: 'active',
      vector_id: faq._id.toString(),
      'ai_suggestion.reviewed_by': adminUsername,
      'ai_suggestion.reviewed_at': new Date(),
      'ai_suggestion.review_notes': notes
    });
  } else {
    // Reject
    await FAQRepository.update(faqId, {
      status: 'rejected',
      'ai_suggestion.reviewed_by': adminUsername,
      'ai_suggestion.reviewed_at': new Date(),
      'ai_suggestion.review_notes': notes
    });
  }
}
```

### 3. FAQ Usage Tracking

```typescript
// When FAQ is returned to user
async function trackFAQUsage(faqId: string) {
  await FAQRepository.update(faqId, {
    $inc: { usage_count: 1 },
    last_used_at: new Date()
  });
}
```

---

## Benefits

1. **Self-Improving System**
   - Learns from real conversations
   - Identifies gaps in FAQ coverage
   - Continuously improves

2. **Reduced Admin Work**
   - AI suggests FAQs automatically
   - Admin just reviews and approves
   - Less manual FAQ creation

3. **Better Coverage**
   - FAQs based on actual user questions
   - Covers questions users actually ask
   - Not just what admins think users ask

4. **Quality Control**
   - Admin reviews all AI suggestions
   - Can edit before approving
   - Maintains FAQ quality

---

## Configuration

```env
# FAQ Suggestion Settings
FAQ_SUGGESTION_ENABLED=true
FAQ_SUGGESTION_MIN_OCCURRENCES=3  # Min times question asked before suggesting
FAQ_SUGGESTION_MIN_CONFIDENCE=0.75  # Min AI confidence to suggest
FAQ_SUGGESTION_REQUIRE_POSITIVE_FEEDBACK=true  # Only suggest if user gave positive feedback
```

---

## Example Scenarios

### Scenario 1: New Common Question

```
Day 1: User asks "What's your shipping cost?"
AI answers: "Shipping is free for orders over 500 SAR..."
No FAQ exists → AI suggests FAQ (pending review)

Day 2: 2 more users ask same question
AI suggests again (higher confidence)

Day 3: Admin reviews, approves
FAQ becomes active → Future users get instant FAQ answer
```

### Scenario 2: FAQ Gap

```
User asks: "Do you ship to Dubai?"
Existing FAQs don't match well (similarity: 0.65)
AI provides good answer
User gives positive feedback
→ AI suggests FAQ (pending review)
```

### Scenario 3: Improving Existing FAQ

```
User asks: "What's your return policy?"
Existing FAQ matches (similarity: 0.88)
But user gives negative feedback
→ AI suggests improved version (pending review)
```

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

