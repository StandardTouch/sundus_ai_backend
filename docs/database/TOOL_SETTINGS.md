# Tool Settings Database Documentation

## Overview

The `tool_settings` collection stores enable/disable settings for AI agent tools. This allows admins to control which tools are available to the AI agent without code changes.

---

## Collection: `tool_settings`

### Schema

```typescript
{
  _id: ObjectId,                    // MongoDB ObjectId (converted to string)
  
  // Tool identification
  tool_name: string,                // Unique tool name (e.g., "search_products", "track_order")
  
  // Tool metadata
  category: string,                 // Tool category: "products" | "orders" | "faqs" | "general"
  display_name: string,             // Human-readable name (e.g., "Search Products")
  description: string,              // Tool description for admin panel
  
  // Status
  is_enabled: boolean,              // Whether tool is enabled (default: true)
  
  // Metadata
  updated_by?: string,             // User ID who last updated this setting
  created_at: Date,                // Creation timestamp
  updated_at: Date                 // Last update timestamp
}
```

---

## Available Tools

### Total: 6 Tools

#### Product Tools (3)
1. **`search_products`**
   - Category: `products`
   - Display Name: "Search Products"
   - Description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, ask about specific brands, or wants product recommendations."

2. **`get_product_details`**
   - Category: `products`
   - Display Name: "Get Product Details"
   - Description: "Get detailed information about a specific product including images, price, description, and specifications. Use this when user asks about a specific product, wants full product information, or clicks on a product from search results."

3. **`list_brands`**
   - Category: `products`
   - Display Name: "List Brands"
   - Description: "Get list of all available brands in the catalog. Use this when user asks 'what brands do you have?', wants to see all brands, or asks about brand options."

#### Order Tools (2)
4. **`track_order`**
   - Category: `orders`
   - Display Name: "Track Order"
   - Description: "Get the LATEST/MOST RECENT order for a user. Use this when user asks 'track my order', 'where is my order', 'show my order', or wants to see their order status WITHOUT mentioning a specific order number."

5. **`get_order_details`**
   - Category: `orders`
   - Display Name: "Get Order Details"
   - Description: "Get detailed information about a SPECIFIC order by order number. Use this ONLY when the user explicitly mentions a specific order number in their message."

#### FAQ Tools (1)
6. **`search_faqs`**
   - Category: `faqs`
   - Display Name: "Search FAQs"
   - Description: "Search the FAQ database for answers to common questions about policies, procedures, shipping, returns, payment, orders, products, and general information."

---

## Example Documents

### Example 1: Enabled Product Tool

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tool_name": "search_products",
  "category": "products",
  "display_name": "Search Products",
  "description": "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, ask about specific brands, or wants product recommendations.",
  "is_enabled": true,
  "updated_by": null,
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

### Example 2: Disabled Order Tool

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "tool_name": "track_order",
  "category": "orders",
  "display_name": "Track Order",
  "description": "Get the LATEST/MOST RECENT order for a user. Use this when user asks 'track my order', 'where is my order', 'show my order', or wants to see their order status WITHOUT mentioning a specific order number.",
  "is_enabled": false,
  "updated_by": "admin_user_id",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

## Indexes

```javascript
// Unique index on tool_name for fast lookups
db.tool_settings.createIndex({ tool_name: 1 }, { unique: true });

// Index on category for filtering by category
db.tool_settings.createIndex({ category: 1 });

// Index on is_enabled for filtering enabled/disabled tools
db.tool_settings.createIndex({ is_enabled: 1 });
```

---

## How It Works

### 1. Tool Initialization

**Automatic Initialization:**
- When `getAllTools()` is called, any tools not in DB are automatically created
- New tools default to `is_enabled: true`
- Category and display name are auto-generated if not specified

**Manual Initialization:**
```bash
npx tsx scripts/init-tool-settings.ts
```
- Creates DB entries for all 6 tools
- All tools enabled by default
- Skips tools that already exist

### 2. Tool Filtering

**Before OpenAI Call:**
```typescript
// System fetches enabled tools from database
const enabledTools = await getEnabledTools();

// Only enabled tools are sent to OpenAI
await openaiService.chatCompletion(messages, {
  tools: enabledTools,  // Filtered list
  tool_choice: enabledTools.length > 0 ? "auto" : "none"
});
```

**Caching:**
- Enabled tools are cached for 1 minute
- Cache invalidated when tools are updated
- Reduces database calls on every message

### 3. Admin Management

**Get All Tools:**
```
GET /api/settings/tools
```

**Toggle Tool:**
```
PUT /api/settings/tools/:toolName/toggle
```

**Update Tool:**
```
PUT /api/settings/tools/:toolName
{
  "is_enabled": false,
  "display_name": "Search Products",
  "description": "Updated description..."
}
```

---

## Use Cases

### 1. Disable Problematic Tool
- Tool causing errors or API issues
- Temporarily disable without code changes
- Re-enable after fixing

### 2. Maintenance Mode
- Disable tools during API maintenance
- Prevent errors from external services
- Better user experience

### 3. A/B Testing
- Test AI behavior with/without specific tools
- Measure impact of tool availability
- Gradual rollout of new features

### 4. Gradual Rollout
- Enable new tools gradually
- Monitor performance and errors
- Full rollout after validation

---

## Important Notes

1. **Default State:** All tools are enabled by default
2. **Auto-Initialization:** New tools are automatically added to DB when first accessed
3. **Caching:** 1-minute cache for performance (invalidated on updates)
4. **Fallback:** On error, system falls back to all tools (safer than disabling everything)
5. **Validation:** System prevents disabling all tools (safety check)

---

## Related Documentation

- [Database Design](./DATABASE_DESIGN.md) - Overall database structure
- [Database Requirements](./DATABASE_REQUIREMENTS.md) - Database requirements
- [Tool Design Guide](../development/TOOL_DESIGN_GUIDE.md) - How to create new tools

