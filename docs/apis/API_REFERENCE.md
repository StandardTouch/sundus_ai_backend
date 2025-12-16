# Sundus AI - API Reference

## Alhomaidhi Group API Integration

This document describes all external APIs used by Sundus AI for product search and order tracking.

**Base URL:** `https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2`

**Common Headers:**
- `Cookie: pll_language=en` (or `ar` for Arabic)
- `Authorization: {api_key}` (constant value from environment variable)
- `phone_number: {phone_number}` (for order endpoints)

---

## Product APIs

### 5. List Brands

**Endpoint:** `GET /retrieve_brands`

**Description:** Retrieves all available brands.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/retrieve_brands' \
  --header 'Authorization: 550699352X72qodSOlbkS6exhCg4KM8ACjJkg3ZKz2Y6138rjtXG47XNSoM' \
  --header 'user_id: 66' \
  --header 'Cookie: pll_language=en'
```

**Headers:**
- `Authorization` (string, required) - API key or token
- `user_id` (string, required) - User ID
- `Cookie: pll_language=en` (string) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": [
    {
      "id": 8931,
      "name": "Aston Martin Watches / آستون مارتن ساعات",
      "img": "https://alhomaidhigroup.com/wp-content/uploads/2025/11/Aston-Martin-Logo.webp"
    }
  ]
}
```

**Response Fields:**
- `id` (number) - Brand ID
- `name` (string) - Brand name (bilingual: English / Arabic)
- `img` (string) - Brand logo URL

**Status Codes:**
- `APP00` - Success

**Usage:**
- Get all brands for brand search
- Display brand list to users
- Use brand ID for filtering products

---

### 6. List Products

**Endpoint:** `GET /list_products`

**Description:** Retrieves products with search, filtering, and pagination.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/list_products?sort_by=&search=&page=1&per_page=1' \
  --header 'Authorization: 550699352X72qodSOlbkS6exhCg4KM8ACjJkg3ZKz2Y6138rjtXG47XNSoM' \
  --header 'user_id: 66' \
  --header 'Cookie: pll_language=en'
```

**Query Parameters:**
- `sort_by` (string, optional) - Sort option (empty for default)
- `search` (string, optional) - Search query (text, SKU, or brand name)
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page

**Headers:**
- `Authorization` (string, required) - API key or token
- `user_id` (string, required) - User ID
- `Cookie: pll_language=en` (string) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": [
    {
      "product_details": {
        "product_id": 38022,
        "name": "Aston Martin Watches / آستون مارتن ساعات",
        "slug": "aston-martin-watches-...",
        "sku": "MTTS2F504",
        "price": "960",
        "regular_price": "1600.0000",
        "sale_price": "960",
        "discount_percentage": "40%",
        "on_sale": true,
        "stock_status": "instock",
        "stock_quantity": 1,
        "description": "<p>...</p>",
        "short_description": "",
        "lang": "en"
      },
      "images": [
        {
          "id": 38018,
          "name": "Z3lqS1NTMmFCL1NmK0kxUzQzSE91Zz09.png",
          "src": "https://alhomaidhigroup.com/wp-content/uploads/2025/12/...",
          "alt": ""
        }
      ],
      "brands": [
        {
          "id": 8931,
          "name": "Aston Martin Watches / آستون مارتن ساعات",
          "slug": "aston-martin-watches-..."
        }
      ],
      "related_product_ids": [4017, 14345, 14350, 3439, 13820]
    }
  ],
  "tot_count": 1
}
```

**Response Fields:**

**Product Details:**
- `product_id` (number) - Product ID
- `name` (string) - Product name (bilingual)
- `slug` (string) - URL slug
- `sku` (string) - Product SKU (for SKU search)
- `price` (string) - Current price
- `regular_price` (string) - Regular price
- `sale_price` (string) - Sale price
- `discount_percentage` (string) - Discount percentage
- `on_sale` (boolean) - Whether product is on sale
- `stock_status` (string) - "instock" or "outofstock"
- `stock_quantity` (number) - Available quantity
- `description` (string) - Full description (HTML)
- `short_description` (string) - Short description

**Images:**
- `id` (number) - Image ID
- `src` (string) - Image URL
- `alt` (string) - Alt text

**Brands:**
- `id` (number) - Brand ID
- `name` (string) - Brand name (bilingual)
- `slug` (string) - Brand slug

**Pagination:**
- `tot_count` (number) - Total number of products

**Status Codes:**
- `APP00` - Success

**Usage:**
- Search products by text, SKU, or brand name
- Use `search` parameter for all search types
- Paginate results using `page` and `per_page`
- Filter by brand using brand name in search

**Search Examples:**
- SKU search: `?search=MTTS2F504`
- Brand search: `?search=Aston Martin`
- Text search: `?search=watch`

---

### 7. Get Single Product

**Endpoint:** `GET /retrieve_product`

**Description:** Retrieves detailed information for a single product.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/retrieve_product?product_id=26025' \
  --header 'Authorization: 550699352X72qodSOlbkS6exhCg4KM8ACjJkg3ZKz2Y6138rjtXG47XNSoM' \
  --header 'user_id: 66' \
  --header 'Cookie: pll_language=en'
```

**Query Parameters:**
- `product_id` (number, required) - Product ID

**Headers:**
- `Authorization` (string, required) - API key or token
- `user_id` (string, required) - User ID
- `Cookie: pll_language=en` (string) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": {
    "product_details": { ... },
    "images": [ ... ],
    "brands": [ ... ],
    "related_product_ids": [ ... ]
  }
}
```

**Response Structure:** Same as list_products, but `message` is a single object (not array).

**Status Codes:**
- `APP00` - Success

**Usage:**
- Get full product details when user clicks on a product
- Generate product page URL: `https://alhomaidhigroup.com/product/{slug}`
- Show detailed product information in chat

---

## Order APIs

### 5. List Orders by Phone Number

**Endpoint:** `GET /list_orders_temp`

**Description:** Retrieves all orders for a user by searching with their phone number. No authentication required - uses constant API key from environment variable.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/list_orders_temp?sort_by=asc&search=6361375923&page=&per_page=null' \
  --header 'Authorization: 5N7ZI3Dh2HIKgqMPBr0mFvfF7fqReF' \
  --header 'phone_number: 6361375923' \
  --header 'Cookie: d_user_session=6974ac9cebc7a3c1cedbb4cbf624fbcc7f4de39b83c8a209867032aaaedd06c3e04a304fd5354926afe61a0187d993fbf4b20fad4c5c26995501f970772a12d3; pll_language=en'
```

**Query Parameters:**
- `sort_by` (string, optional) - "asc" or "desc" (default: "asc")
- `search` (string, required) - Phone number to search orders by (e.g., "6361375923")
- `page` (string, optional) - Page number (empty string for all)
- `per_page` (string, optional) - Items per page ("null" for all)

**Headers:**
- `Authorization` (string, required) - Constant API key from environment variable (e.g., `ALHOMAIDHI_ORDER_API_KEY`)
- `phone_number` (string, required) - User's phone number (e.g., "6361375923")
- `Cookie: pll_language=en` (string, optional) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": [
    {
      "order_details": {
        "order_id": "#6956",
        "order_placed_date": "2024-02-28T19:42:56",
        "order_date_modified": "2024-02-28T22:32:35",
        "order_status": "wc-completed",
        "total": "1.15",
        "total_tax": "0.15",
        "discount_total": "0.00",
        "discount_tax": "0.00",
        "cart_tax": "0.15"
      },
      "billing_details": {
        "first_name": "kahkashan",
        "last_name": "shaik custm",
        "company": "Standardtouch",
        "address_1": "1-1165/5e, Firsttttt Floor123",
        "address_2": "Glass House, Aiwan-E-Shahi Areaaa",
        "city": "Diriyah",
        "state": "",
        "postcode": "585104",
        "email": "kahkashan+test@standardtouch.com",
        "phone": "+9666361375923"
      },
      "payment_details": {
        "payment_method": "clickpay_all",
        "payment_method_title": "Online payments powered by ClickPay",
        "date_paid": "2024-02-28T19:43:55",
        "pay_latter_link": ""
      },
      "items": [
        {
          "item_name": "Watch Boxes &amp; Display",
          "product_id": 3593,
          "quantity": 1,
          "subtotal": "1.00",
          "subtotal_tax": "0.15",
          "total": "1.00",
          "total_tax": "0.15",
          "sku": "WBD",
          "image": "https://alhomaidhigroup.com/wp-content/uploads/2024/02/watch-fall-back-image.png"
        }
      ]
    }
  ]
}
```

**Response Fields:**

**Order Details:**
- `order_id` (string) - Order ID (format: "#6956")
- `order_placed_date` (string) - ISO timestamp
- `order_date_modified` (string) - ISO timestamp
- `order_status` (string) - WooCommerce status:
  - `wc-completed` - Completed
  - `wc-processing` - Processing
  - `wc-pending` - Pending
  - `wc-on-hold` - On Hold
  - `wc-cancelled` - Cancelled
  - `wc-refunded` - Refunded
  - `wc-failed` - Failed
- `total` (string) - Total amount
- `total_tax` (string) - Total tax
- `discount_total` (string) - Discount amount
- `discount_tax` (string) - Discount tax
- `cart_tax` (string) - Cart tax

**Billing Details:**
- `first_name`, `last_name` (string) - Customer name
- `company` (string) - Company name
- `address_1`, `address_2` (string) - Address
- `city`, `state`, `postcode` (string) - Location
- `email`, `phone` (string) - Contact info

**Payment Details:**
- `payment_method` (string) - Payment method code
- `payment_method_title` (string) - Payment method name
- `date_paid` (string) - ISO timestamp
- `pay_latter_link` (string) - Payment link (if applicable)

**Items:**
- `item_name` (string) - Product name
- `product_id` (number) - Product ID
- `quantity` (number) - Quantity
- `subtotal`, `subtotal_tax` (string) - Subtotal amounts
- `total`, `total_tax` (string) - Total amounts
- `sku` (string) - Product SKU
- `image` (string) - Product image URL

**Status Codes:**
- `APP00` - Success

**Usage:**
- Get all orders for a user by phone number
- Display order list to user
- Filter orders by phone number (via `search` parameter)
- No OTP or authentication required

**Notes:**
- The `Authorization` header uses a constant API key stored in environment variables
- The `phone_number` header must match the `search` query parameter
- Returns an array of orders - filter by order_id in the response if user asks for a specific order

---

## API Integration Flow

### Order Tracking Flow

```
1. User: "Track order #6317" or "Show my orders"
   ↓
2. Extract phone number from user's WhatsApp message
   ↓
3. Call GET /list_orders_temp?sort_by=asc&search={phone_number}&page=&per_page=null
   Headers:
   - Authorization: {ALHOMAIDHI_ORDER_API_KEY} (from env)
   - phone_number: {phone_number}
   ↓
4. API returns array of orders for that phone number
   ↓
5. If user specified order ID (e.g., "#6317"):
   - Filter response array to find matching order_id
   - Display that specific order
   ↓
6. If user asked for all orders:
   - Display list of all orders
   ↓
7. Format and send order details to user
```

### Product Search Flow

```
1. User: "Search product SKU123" or "Find Nike watches"
   ↓
2. Parse query:
   - Extract SKU pattern
   - Extract brand/product name
   ↓
3. Call GET /list_products?search={query}
   ↓
4. If single result:
   - Call GET /retrieve_product?product_id={id}
   - Send full product details
   ↓
5. If multiple results:
   - Send list of products (top 5)
   - User can select for details
   ↓
6. Generate product link:
   https://alhomaidhigroup.com/product/{slug}
```

---

## Error Handling

### Status Codes

**Success Codes:**
- `APP00` - Success (Product/Order APIs)

**Error Codes:**
- To be documented based on API responses

### Common Errors

1. **Order Not Found**
   - Response: Empty message array or error
   - Action: Inform user order not found or no orders exist for this phone number

2. **Product Not Found**
   - Response: Empty message array
   - Action: Suggest alternative search terms

3. **Invalid API Key**
   - Response: 401 Unauthorized or error status
   - Action: Check environment variable configuration

---

## Rate Limiting

**Recommendations:**
- API calls: Implement caching where possible
- Product search: Cache popular searches
- Order lookup: Cache recent orders by phone number

---

## Security Considerations

1. **API Key Storage**
   - Store API key in environment variables (e.g., `ALHOMAIDHI_ORDER_API_KEY`)
   - Never expose in client-side code or logs
   - Use constant value from environment for order API calls

2. **Phone Number Format**
   - Use phone number as provided by WhatsApp (may include country code)
   - Pass phone number in both `search` query parameter and `phone_number` header
   - Store full number with country code internally

3. **Error Messages**
   - Don't expose sensitive information
   - Generic error messages for users
   - Don't reveal API key in error responses

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

