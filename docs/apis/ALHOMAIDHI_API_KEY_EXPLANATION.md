# ALHOMAIDHI_API_KEY - Why We Need It

## Purpose

The `ALHOMAIDHI_API_KEY` (or `ALHOMAIDHI_ORDER_API_KEY` for orders) is used for API endpoints that don't require user authentication:

### ✅ Uses API Key (No User Authentication Required)

**1. List Brands**
```bash
GET /retrieve_brands
Headers:
  Authorization: {ALHOMAIDHI_API_KEY}
  user_id: 66
```
- Public data (brand list)
- No user authentication needed
- Uses API key

**2. Search Products**
```bash
GET /list_products?search={query}
Headers:
  Authorization: {ALHOMAIDHI_API_KEY}
  user_id: 66
```
- Public data (product catalog)
- No user authentication needed
- Uses API key

**3. Get Product Details**
```bash
GET /retrieve_product?product_id={id}
Headers:
  Authorization: {ALHOMAIDHI_API_KEY}
  user_id: 66
```
- Public data (product information)
- No user authentication needed
- Uses API key

**4. List Orders by Phone Number**
```bash
GET /list_orders_temp?search={phone_number}
Headers:
  Authorization: {ALHOMAIDHI_ORDER_API_KEY}  # Constant value from env
  phone_number: {phone_number}
```
- User's order data (searched by phone number)
- No OTP or user authentication required
- Uses constant API key from environment variable
- Phone number is used to identify user's orders

## Summary

| Endpoint | Authentication | Uses |
|----------|---------------|------|
| `/retrieve_brands` | API Key | `ALHOMAIDHI_API_KEY` |
| `/list_products` | API Key | `ALHOMAIDHI_API_KEY` |
| `/retrieve_product` | API Key | `ALHOMAIDHI_API_KEY` |
| `/list_orders_temp` | API Key | `ALHOMAIDHI_ORDER_API_KEY` (constant from env) |

## Why We Need It

- **Product Search**: Users can search products without authentication
- **Brand Listing**: Users can see brands without authentication
- **Order Tracking**: Uses constant API key - no OTP or user authentication required
  - Orders are identified by phone number
  - API key is a constant value stored in environment variables

## Environment Variables

- `ALHOMAIDHI_API_KEY` - For product and brand endpoints
- `ALHOMAIDHI_ORDER_API_KEY` - For order endpoint (constant value, e.g., "5N7ZI3Dh2HIKgqMPBr0mFvfF7fqReF")

