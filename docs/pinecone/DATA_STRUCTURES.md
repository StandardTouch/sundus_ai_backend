# FAQ Data Structures: MongoDB vs Pinecone

This document shows the exact data structures used in MongoDB and Pinecone, with real examples.

---

## 📊 Overview

| Storage | Purpose | Data Type |
|---------|---------|-----------|
| **MongoDB** | FAQ metadata, content, status | JSON documents |
| **Pinecone** | Vector embeddings for semantic search | Vectors + metadata |

**Key Link:** `MongoDB._id` = `Pinecone._id` (same ID connects both)

---

## 🗄️ MongoDB Structure

### Collection: `faqs`

**Schema:**
```typescript
{
  _id: string,                    // MongoDB ObjectId (converted to string)
  question: string,                // FAQ question (English)
  question_ar?: string,           // FAQ question (Arabic) - optional
  answer: string,                 // FAQ answer (English)
  answer_ar?: string,             // FAQ answer (Arabic) - optional
  category?: string,              // FAQ category - MUST ALWAYS BE IN ENGLISH (optional, e.g., "policies", "shipping", "payment", "orders")
  
  // Vector Search Link
  vector_id: string,             // Pinecone vector ID (same as _id)
  
  // Source & Status
  source: 'manual' | 'ai_suggested',
  status: 'active' | 'pending_review' | 'rejected',
  
  // AI Suggestion Details (only if source is 'ai_suggested')
  ai_suggestion?: {
    source_conversation_id?: string,
    source_message_id?: string,
    confidence_score?: number,    // 0-1
    suggested_at: Date,
    reviewed_by?: string,         // Admin username
    reviewed_at?: Date,
    review_notes?: string
  },
  
  // Usage Statistics
  usage_count: number,            // How many times this FAQ was returned
  last_used_at?: Date,
  
  // Metadata
  is_active: boolean,
  created_at: Date,
  updated_at: Date
}
```

---

### Example 1: Manual FAQ (Active)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "question": "What is your return policy?",
  "question_ar": "ما هي سياسة الإرجاع الخاصة بك؟",
  "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
  "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
  "category": "policies",
  "vector_id": "507f1f77bcf86cd799439011",
  "source": "manual",
  "status": "active",
  "usage_count": 45,
  "last_used_at": "2024-01-15T10:30:00.000Z",
  "is_active": true,
  "created_at": "2024-01-01T08:00:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

---

### Example 2: AI-Suggested FAQ (Pending Review)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "question": "How do I track my order?",
  "question_ar": "كيف يمكنني تتبع طلبي؟",
  "answer": "You can track your order by providing your order number to our customer service team via WhatsApp. They will provide you with the current status and tracking information.",
  "answer_ar": "يمكنك تتبع طلبك من خلال تقديم رقم الطلب لفريق خدمة العملاء عبر واتساب. سيوفرون لك الحالة الحالية ومعلومات التتبع.",
  "category": "orders",
  "vector_id": "",  // Empty until approved and synced to Pinecone
  "source": "ai_suggested",
  "status": "pending_review",
  "ai_suggestion": {
    "source_conversation_id": "conv_12345",
    "source_message_id": "msg_67890",
    "confidence_score": 0.87,
    "suggested_at": "2024-01-20T14:22:00.000Z",
    "reviewed_by": null,
    "reviewed_at": null,
    "review_notes": null
  },
  "usage_count": 0,
  "last_used_at": null,
  "is_active": false,  // Not active until approved
  "created_at": "2024-01-20T14:22:00.000Z",
  "updated_at": "2024-01-20T14:22:00.000Z"
}
```

---

### Example 3: AI-Suggested FAQ (Approved & Active)

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "question": "What payment methods do you accept?",
  "question_ar": "ما هي طرق الدفع التي تقبلونها؟",
  "answer": "We accept credit cards, debit cards, and cash on delivery. All major credit cards are accepted including Visa, Mastercard, and American Express.",
  "answer_ar": "نقبل بطاقات الائتمان والخصم والدفع نقدًا عند التسليم. يتم قبول جميع بطاقات الائتمان الرئيسية بما في ذلك فيزا وماستركارد وأمريكان إكسبريس.",
  "category": "payment",
  "vector_id": "507f1f77bcf86cd799439013",  // Set after approval
  "source": "ai_suggested",
  "status": "active",
  "ai_suggestion": {
    "source_conversation_id": "conv_12346",
    "source_message_id": "msg_67891",
    "confidence_score": 0.92,
    "suggested_at": "2024-01-18T09:15:00.000Z",
    "reviewed_by": "admin_user",
    "reviewed_at": "2024-01-19T11:30:00.000Z",
    "review_notes": "Good suggestion, approved with minor edits"
  },
  "usage_count": 12,
  "last_used_at": "2024-01-22T16:45:00.000Z",
  "is_active": true,
  "created_at": "2024-01-18T09:15:00.000Z",
  "updated_at": "2024-01-19T11:30:00.000Z"
}
```

---

### Example 4: Rejected AI-Suggested FAQ

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "question": "Can I get a discount?",
  "answer": "Yes, we offer discounts on selected items. Check our website for current promotions.",
  "answer_ar": null,  // Not provided
  "category": "pricing",
  "vector_id": "",  // Never set (rejected)
  "source": "ai_suggested",
  "status": "rejected",
  "ai_suggestion": {
    "source_conversation_id": "conv_12347",
    "source_message_id": "msg_67892",
    "confidence_score": 0.65,
    "suggested_at": "2024-01-21T10:00:00.000Z",
    "reviewed_by": "admin_user",
    "reviewed_at": "2024-01-21T15:20:00.000Z",
    "review_notes": "Too generic, not useful as FAQ"
  },
  "usage_count": 0,
  "last_used_at": null,
  "is_active": false,
  "created_at": "2024-01-21T10:00:00.000Z",
  "updated_at": "2024-01-21T15:20:00.000Z"
}
```

---

## 🔍 Pinecone Structure

### Index: `sundus-faqs`
### Namespace: `faqs` (default)

**Record Structure:**
```typescript
{
  _id: string,                    // Same as MongoDB _id
  content: string,                // Combined question + answer (for embedding)
  category?: string,              // FAQ category (metadata)
  [key: string]: any              // Additional metadata fields
}
```

**Note:** Pinecone uses **integrated embeddings**, so:
- You provide `content` field (text)
- Pinecone automatically generates embeddings using `llama-text-embed-v2`
- No need to generate embeddings manually with OpenAI

---

### Example 1: Active FAQ in Pinecone

**What we send to Pinecone:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "content": "What is your return policy? You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return. ما هي سياسة الإرجاع الخاصة بك؟ يمكنك إرجاع العناصر خلال 30 يومًا من الشراء. يجب أن تكون العناصر غير مستخدمة وفي التغليف الأصلي. يرجى الاتصال بخدمة العملاء لبدء الإرجاع.",
  "category": "policies"
}
```

**Note:** Content includes both English and Arabic (if provided) for better multilingual semantic search.

**What Pinecone stores internally:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "vector": [0.123, -0.456, 0.789, 0.234, -0.567, ...],  // 768-dimensional vector (auto-generated)
  "fields": {
    "content": "What is your return policy? You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
    "category": "policies"
  },
  "metadata": {
    "category": "policies"
  }
}
```

**Note:** The `vector` array is automatically generated by Pinecone from the `content` field. You don't need to provide it.

---

### Example 2: Multiple FAQs in Pinecone

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "content": "What is your return policy? You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return. ما هي سياسة الإرجاع الخاصة بك؟ يمكنك إرجاع العناصر خلال 30 يومًا من الشراء.",
    "category": "policies"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "content": "What payment methods do you accept? We accept credit cards, debit cards, and cash on delivery. All major credit cards are accepted including Visa, Mastercard, and American Express. ما هي طرق الدفع التي تقبلونها؟ نقبل بطاقات الائتمان والخصم والدفع نقدًا عند التسليم.",
    "category": "payment"
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "content": "How long does shipping take? Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Shipping times may vary based on your location.",
    "category": "shipping"
  }
]
```

---

## 🔄 Data Flow Examples

### Scenario 1: Creating a New FAQ

**Step 1: Admin creates FAQ in MongoDB**
```json
// MongoDB Document (before Pinecone sync)
{
  "_id": "507f1f77bcf86cd799439016",
  "question": "Do you offer international shipping?",
  "answer": "Yes, we offer international shipping to most countries. Shipping costs and delivery times vary by location. Please contact us for specific rates.",
  "answer_ar": "نعم، نقدم الشحن الدولي لمعظم البلدان. تختلف تكاليف الشحن وأوقات التسليم حسب الموقع. يرجى الاتصال بنا للحصول على الأسعار المحددة.",
  "category": "shipping",
  "vector_id": "",  // Empty initially
  "source": "manual",
  "status": "active",
  "usage_count": 0,
  "is_active": true,
  "created_at": "2024-01-25T10:00:00.000Z",
  "updated_at": "2024-01-25T10:00:00.000Z"
}
```

**Step 2: Sync to Pinecone**
```typescript
// Prepare FAQ for Pinecone (includes both EN and AR for multilingual search)
const faqRecord = {
  _id: "507f1f77bcf86cd799439016",
  content: "Do you offer international shipping? Yes, we offer international shipping to most countries. Shipping costs and delivery times vary by location. Please contact us for specific rates. هل تقدمون شحن دولي؟ نعم، نقدم الشحن الدولي لمعظم البلدان. تختلف تكاليف الشحن وأوقات التسليم حسب الموقع.",
  category: "shipping"
};

// Upsert to Pinecone
await pineconeService.upsertFAQs([faqRecord]);
```

**Step 3: Update MongoDB with vector_id**
```json
// MongoDB Document (after Pinecone sync)
{
  "_id": "507f1f77bcf86cd799439016",
  "question": "Do you offer international shipping?",
  "answer": "Yes, we offer international shipping to most countries...",
  "answer_ar": "نعم، نقدم الشحن الدولي لمعظم البلدان...",
  "category": "shipping",
  "vector_id": "507f1f77bcf86cd799439016",  // ✅ Now set
  "source": "manual",
  "status": "active",
  "usage_count": 0,
  "is_active": true,
  "created_at": "2024-01-25T10:00:00.000Z",
  "updated_at": "2024-01-25T10:05:00.000Z"  // Updated after sync
}
```

---

### Scenario 2: Searching FAQs

**Step 1: User asks question**
```
User: "How can I return something I bought?"
```

**Step 2: Search Pinecone**
```typescript
// Search query
const query = "How can I return something I bought?";

// Pinecone search (semantic search)
const results = await pineconeService.searchFAQs(query, 5);
```

**Step 3: Pinecone returns results**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "_score": 0.92,  // High similarity!
    "fields": {
      "content": "What is your return policy? You can return items within 30 days of purchase...",
      "category": "policies"
    }
  },
  {
    "_id": "507f1f77bcf86cd799439017",
    "_score": 0.78,
    "fields": {
      "content": "How do I initiate a return? Contact customer service...",
      "category": "policies"
    }
  },
  {
    "_id": "507f1f77bcf86cd799439018",
    "_score": 0.65,  // Below threshold (0.75), will be filtered
    "fields": {
      "content": "What is your refund policy? Refunds are processed within 5-7 business days...",
      "category": "policies"
    }
  }
]
```

**Step 4: Fetch full FAQ details from MongoDB**
```typescript
// Get IDs from Pinecone results
const faqIds = results.map(r => r._id);  // ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439017"]

// Fetch from MongoDB
const faqs = await faqRepository.findByIds(faqIds);
```

**Step 5: MongoDB returns full FAQ**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "question": "What is your return policy?",
    "answer": "You can return items within 30 days of purchase. Items must be unused and in original packaging. Please contact customer service to initiate a return.",
    "answer_ar": "يمكنك إرجاع العناصر خلال 30 يومًا من الشراء...",
    "category": "policies",
    "vector_id": "507f1f77bcf86cd799439011",
    "source": "manual",
    "status": "active",
    "usage_count": 45,
    "is_active": true,
    "created_at": "2024-01-01T08:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

**Step 6: Format and return to user**
```typescript
// Format FAQ for AI response
const formattedAnswer = faqService.formatFAQForAI(faqs[0], 'en');
// Result: "According to our return policy: You can return items within 30 days of purchase..."
```

---

## 🔗 Key Relationships

### ID Linking
```
MongoDB._id = Pinecone._id = vector_id
```

**Example:**
- MongoDB: `_id: "507f1f77bcf86cd799439011"`
- Pinecone: `_id: "507f1f77bcf86cd799439011"`
- MongoDB: `vector_id: "507f1f77bcf86cd799439011"`

All three use the same ID to link the records.

---

### Content Mapping

**MongoDB stores:**
- `question`: "What is your return policy?"
- `question_ar`: "ما هي سياسة الإرجاع الخاصة بك؟" (optional)
- `answer`: "You can return items within 30 days..."
- `answer_ar`: "يمكنك إرجاع العناصر..." (optional)

**Pinecone stores:**
- `content`: "What is your return policy? You can return items within 30 days... ما هي سياسة الإرجاع الخاصة بك؟ يمكنك إرجاع العناصر..." (question + answer + question_ar + answer_ar combined for better multilingual search)

**Why combine?** The combined text provides better context for semantic search.

---

## 📋 Field Comparison

| Field | MongoDB | Pinecone | Purpose |
|-------|---------|----------|---------|
| **ID** | `_id` | `_id` | Link records |
| **Question (EN)** | `question` | ❌ | Human-readable |
| **Question (AR)** | `question_ar` | ❌ | Human-readable (optional) |
| **Answer (EN)** | `answer` | ❌ | Return to users |
| **Answer (AR)** | `answer_ar` | ❌ | Return to users (optional) |
| **Combined Text** | ❌ | `content` | For embedding (includes EN + AR for multilingual search) |
| **Category** | `category` | `category` | Organization |
| **Vector Embedding** | ❌ | `vector` (auto) | Semantic search |
| **Status** | `status` | ❌ | Active/Pending/Rejected |
| **Source** | `source` | ❌ | Manual/AI-suggested |
| **Usage Stats** | `usage_count`, `last_used_at` | ❌ | Analytics |
| **AI Suggestion** | `ai_suggestion` | ❌ | Review workflow |

---

## 🎯 Key Points

1. **MongoDB = Content + Metadata**
   - Stores human-readable FAQ data
   - Tracks status, source, usage
   - Easy to query and update

2. **Pinecone = Search Engine**
   - Stores vector embeddings (auto-generated)
   - Enables semantic search
   - Returns IDs + similarity scores

3. **Both are needed:**
   - Pinecone finds relevant FAQs (by meaning)
   - MongoDB provides full FAQ details (to return to users)

4. **ID Linking:**
   - Same ID in both systems
   - `MongoDB._id` = `Pinecone._id` = `MongoDB.vector_id`

5. **Content Format:**
   - MongoDB: Separate `question` and `answer`
   - Pinecone: Combined `content` (question + answer)

---

## 🔍 Search Flow Summary

```
User Query: "How do I return an item?"
    ↓
Pinecone Search → Returns: [{ _id: "faq123", _score: 0.92 }]
    ↓
MongoDB Fetch → Get full FAQ using _id
    ↓
Format Answer → Return to user (EN or AR)
```

---

## 📂 Category Field Design

### Current Implementation: Plain String (Recommended)

**Type:** `category?: string` (optional)

**⚠️ CRITICAL REQUIREMENT: Categories MUST ALWAYS BE IN ENGLISH**

Regardless of whether the FAQ has Arabic content (`question_ar`, `answer_ar`), the `category` field must always be in English. This ensures:
- Consistent filtering and querying
- Better analytics and reporting
- Standardized category names across the system
- Easier integration with external systems

**Why Plain String?**
- ✅ **Flexible:** Can add new categories without code changes
- ✅ **Simple:** No need to maintain enum/constant lists
- ✅ **Scalable:** Easy to add categories as business grows
- ✅ **Admin-friendly:** Admins can type any category name
- ✅ **AI-suggested FAQs:** AI can suggest new categories dynamically

**Examples (ALL IN ENGLISH):**
```typescript
// Valid categories (must be in English)
category: "policies"
category: "shipping"
category: "payment"
category: "orders"
category: "products"
category: "returns"
category: "warranty"
category: "account"
category: "general"
category: null  // Optional - can be omitted
```

### Common Category Examples

Based on typical e-commerce FAQ needs:

**⚠️ IMPORTANT: All categories MUST be in English, even for FAQs with Arabic content.**

| Category | Description | Example FAQs |
|----------|-------------|--------------|
| `policies` | Company policies | Return policy, refund policy, privacy policy |
| `shipping` | Shipping & delivery | Shipping times, delivery options, international shipping |
| `payment` | Payment methods | Accepted payment methods, payment security |
| `orders` | Order management | Track orders, cancel orders, modify orders |
| `products` | Product information | Product details, availability, specifications |
| `returns` | Returns & exchanges | Return process, exchange policy, refund timeline |
| `account` | Account management | Login, password reset, profile updates |
| `warranty` | Warranty & support | Warranty terms, support contact |
| `general` | General questions | About us, contact info, business hours |

**Note:** These are examples only. You can use any category name that makes sense for your business, but **always use English** regardless of the FAQ's language.

---

### Alternative: Enum/Constant List (Optional - Future Enhancement)

If you want stricter validation in the future, you could define:

```typescript
// Optional: Define common categories as constants
export const FAQ_CATEGORIES = {
  POLICIES: 'policies',
  SHIPPING: 'shipping',
  PAYMENT: 'payment',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  RETURNS: 'returns',
  ACCOUNT: 'account',
  WARRANTY: 'warranty',
  GENERAL: 'general'
} as const;

export type FAQCategory = typeof FAQ_CATEGORIES[keyof typeof FAQ_CATEGORIES] | string;
```

**When to use enum:**
- If you need strict validation
- If you want dropdown lists in admin UI
- If you need category-based analytics/filtering

**Recommendation:** Start with plain string, add enum later if needed.

---

### Category Usage in Code

**MongoDB:**
```typescript
// Store category as plain string
{
  category: "policies"  // or any string, or null/undefined
}
```

**Pinecone:**
```typescript
// Store category as metadata
{
  _id: "faq123",
  content: "What is your return policy? You can return items...",
  category: "policies"  // Optional metadata for filtering
}
```

**Querying by Category (Future Enhancement):**
```typescript
// MongoDB: Find FAQs by category
const faqs = await faqRepository.findByCategory("policies");

// Pinecone: Filter search by category (if needed)
const results = await pineconeService.searchFAQs(query, 5, "faqs", {
  category: "policies"  // Optional filter
});
```

---

## 📝 Notes

- **Pinecone uses integrated embeddings:** No need to generate embeddings with OpenAI
- **Content field:** Must combine question + answer for Pinecone
- **Similarity threshold:** Default 0.75 (configurable)
- **Active FAQs only:** Filter by `is_active: true` and `status: 'active'`
- **Language support:** Store both EN and AR in MongoDB, format based on user preference
- **Category field:** Plain string (optional) - flexible and scalable

