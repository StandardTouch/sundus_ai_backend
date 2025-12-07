# Sundus AI - API Reference

## Alhomaidhi Group API Integration

This document describes all external APIs used by Sundus AI for product search, order tracking, and authentication.

**Base URL:** `https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2`

**Common Headers:**
- `Cookie: pll_language=en` (or `ar` for Arabic)
- `Authorization: {token}` (for authenticated endpoints)
- `user_id: {user_id}` (for authenticated endpoints)

---

## Authentication APIs

### 1. Send OTP

**Endpoint:** `POST /number_verification`

**Description:** Sends OTP to user's phone number for authentication. The WordPress website handles OTP delivery and verification - we just call the API.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/number_verification' \
  --header 'Cookie: pll_language=en' \
  --form 'phone_number="560916906"'
```

**Request Body (form-data):**
- `phone_number` (string, required) - Phone number without country code prefix

**Response:**
```json
{
  "message": "success",
  "status": "DELAPP00"
}
```

**Status Codes:**
- `DELAPP00` - Success
- Other codes - Error (to be documented)

**Notes:**
- OTP is sent via SMS/email by the API
- We need to send the OTP to user via WhatsApp using AI Sensy
- Phone number format: "560916906" (without country code)

---

### 2. Verify OTP

**Endpoint:** `POST /otp_verification`

**Description:** Verifies OTP code and returns authentication token.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/otp_verification' \
  --header 'Cookie: pll_language=en' \
  --form 'phone_number="560916906"' \
  --form 'otp_code="999004"'
```

**Request Body (form-data):**
- `phone_number` (string, required) - Phone number
- `otp_code` (string, required) - OTP code received

**Response:**
```json
{
  "status": "DELAPP00",
  "message": {
    "token": "963841642FjxmU6oUoMZ9e82gT9PBTVWqjCph70pta4NUx0TTPtXcqQfFQu",
    "user_id": "66",
    "username": "abulaalaali",
    "useremail": "abul.aala@standardtouch.com",
    "mobileno": "560916906",
    "arabic_full_name": " ",
    "master_customer_id": "47853",
    "full_name": "Abul Aala Mauzzam Ali"
  }
}
```

**Response Fields:**
- `token` (string) - Authentication token (use in Authorization header)
- `user_id` (string) - User ID (use in user_id header)
- `master_customer_id` (string) - Customer ID
- `full_name` (string) - User's full name
- `mobileno` (string) - Phone number

**Status Codes:**
- `DELAPP00` - Success
- Other codes - Invalid OTP or error

**Usage:**
- Store `token` and `user_id` for authenticated API calls
- Token is used in `Authorization` header (not Bearer format)
- Token should be validated before use

---

### 3. Verify Token

**Endpoint:** `POST /token_verification`

**Description:** Validates if authentication token is still valid.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/token_verification' \
  --header 'Cookie: pll_language=en' \
  --form 'token="963841642FjxmU6oUoMZ9e82gT9PBTVWqjCph70pta4NUx0TTPtXcqQfFQu"' \
  --form 'user_id="66"'
```

**Request Body (form-data):**
- `token` (string, required) - Authentication token
- `user_id` (string, required) - User ID

**Response:**
```json
{
  "message": "success",
  "status": "DELAPP00"
}
```

**Status Codes:**
- `DELAPP00` - Token is valid
- Other codes - Token is invalid or expired

**Usage:**
- Validate token before making authenticated API calls
- Can be used to check if user session is still active

---

### 4. Resend OTP

**Endpoint:** `POST /resend_otp_request`

**Description:** Resends OTP to user's phone number.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/resend_otp_request' \
  --header 'Cookie: pll_language=en' \
  --form 'phone_number="560916906"'
```

**Request Body (form-data):**
- `phone_number` (string, required) - Phone number

**Response:**
```json
{
  "message": "success",
  "status": "DELAPP00"
}
```

**Status Codes:**
- `DELAPP00` - Success
- Other codes - Error

**Usage:**
- Use when user didn't receive OTP
- Implement rate limiting (max 3 resends per hour)

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

### 8. List Orders

**Endpoint:** `GET /list_orders`

**Description:** Retrieves all orders for authenticated user.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/list_orders?sort_by=asc&search=&page=null&per_page=null' \
  --header 'Authorization: 963841642FjxmU6oUoMZ9e82gT9PBTVWqjCph70pta4NUx0TTPtXcqQfFQu' \
  --header 'user_id: 66' \
  --header 'Cookie: pll_language=en'
```

**Query Parameters:**
- `sort_by` (string, optional) - "asc" or "desc" (default: "asc")
- `search` (string, optional) - Search query
- `page` (number, optional) - Page number (null for all)
- `per_page` (number, optional) - Items per page (null for all)

**Headers:**
- `Authorization` (string, required) - Token from OTP verification
- `user_id` (string, required) - User ID from OTP verification
- `Cookie: pll_language=en` (string) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": [
    {
      "order_details": {
        "order_id": "#6317",
        "order_placed_date": "2024-02-13T14:25:44",
        "order_date_modified": "2024-02-14T00:39:49",
        "order_status": "wc-completed",
        "total": "1.15",
        "total_tax": "0.15",
        "discount_total": "0.00",
        "discount_tax": "0.00",
        "cart_tax": "0.15"
      },
      "billing_details": {
        "first_name": "Abul Aala",
        "last_name": "Ali",
        "company": "",
        "address_1": "P.O. Box 385038, Riyadh 11355, Saudi Arabia",
        "address_2": "",
        "city": "Riyadh",
        "state": "",
        "postcode": "11355",
        "email": "abul.aala@standardtouch.com",
        "phone": "+966560916906"
      },
      "payment_details": {
        "payment_method": "hyperpay",
        "payment_method_title": "Hyperpay Gateway",
        "date_paid": "2024-02-13T14:28:37",
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
- `order_id` (string) - Order ID (format: "#6317")
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
- `cart_tax` (string) - Cart tax

**Billing Details:**
- `first_name`, `last_name` (string) - Customer name
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
- `subtotal`, `total` (string) - Amounts
- `sku` (string) - Product SKU
- `image` (string) - Product image URL

**Status Codes:**
- `APP00` - Success

**Usage:**
- Get all orders for authenticated user
- Display order list to user
- Filter by order status or date

---

### 9. Get Single Order

**Endpoint:** `GET /retrieve_order`

**Description:** Retrieves detailed information for a single order.

**Request:**
```bash
curl --location 'https://alhomaidhigroup.com/wp-json/alhomaidhiapp/v2/retrieve_order?order_id=6317' \
  --header 'Authorization: 963841642FjxmU6oUoMZ9e82gT9PBTVWqjCph70pta4NUx0TTPtXcqQfFQu' \
  --header 'user_id: 66' \
  --header 'Cookie: pll_language=en'
```

**Query Parameters:**
- `order_id` (number or string, required) - Order ID (with or without "#" prefix)

**Headers:**
- `Authorization` (string, required) - Token from OTP verification
- `user_id` (string, required) - User ID from OTP verification
- `Cookie: pll_language=en` (string) - Language preference

**Response:**
```json
{
  "status": "APP00",
  "message": {
    "order_details": { ... },
    "billing_details": { ... },
    "payment_details": { ... },
    "items": [ ... ]
  }
}
```

**Response Structure:** Same as list_orders, but `message` is a single object (not array).

**Status Codes:**
- `APP00` - Success

**Usage:**
- Get detailed order information
- Track specific order by order ID
- Display order details to user

**Order ID Format:**
- Accepts: "6317" or "#6317"
- API handles both formats

---

## API Integration Flow

### Order Tracking Flow

```
1. User: "Track order #6317"
   ↓
2. Check if user is authenticated (has token)
   ↓
3. If not authenticated:
   a. Call POST /number_verification (send OTP)
   b. Send OTP to user via WhatsApp
   c. Wait for user to provide OTP
   d. Call POST /otp_verification
   e. Store token and user_id
   ↓
4. If authenticated:
   a. Validate token: POST /token_verification
   b. If invalid, re-authenticate
   ↓
5. Call GET /retrieve_order?order_id=6317
   (with Authorization header)
   ↓
6. Format and send order details to user
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
- `DELAPP00` - Success (OTP/Auth APIs)

**Error Codes:**
- To be documented based on API responses

### Common Errors

1. **Invalid Token**
   - Response: Non-`DELAPP00` status
   - Action: Re-authenticate user

2. **Invalid OTP**
   - Response: Non-`DELAPP00` status
   - Action: Allow retry or resend OTP

3. **Order Not Found**
   - Response: Empty message array or error
   - Action: Inform user order not found

4. **Product Not Found**
   - Response: Empty message array
   - Action: Suggest alternative search terms

---

## Rate Limiting

**Recommendations:**
- OTP requests: Max 3 per hour per phone number
- API calls: Implement caching where possible
- Product search: Cache popular searches
- Order lookup: Cache recent orders

---

## Security Considerations

1. **Token Storage**
   - Store tokens securely (encrypted)
   - Implement token expiration
   - Validate tokens before use

2. **Phone Number Format**
   - Remove country code prefix for API calls
   - Store full number with country code internally

3. **API Key**
   - Store in environment variables
   - Never expose in client-side code

4. **Error Messages**
   - Don't expose sensitive information
   - Generic error messages for users

---

_Last Updated: [Current Date]_
_Version: 1.0.0_

