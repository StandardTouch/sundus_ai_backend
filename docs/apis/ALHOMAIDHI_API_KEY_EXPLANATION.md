# ALHOMAIDHI_API_KEY - Why We Need It

## Purpose

The `ALHOMAIDHI_API_KEY` is used for **public API endpoints** that don't require user authentication:

### ✅ Uses API Key (Public Endpoints)

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

### ❌ Uses Token (Private Endpoints - After OTP)

**1. List Orders**
```bash
GET /list_orders
Headers:
  Authorization: {token}  # From OTP verification, NOT API key
  user_id: {user_id}     # From OTP verification
```
- Private data (user's orders)
- Requires user authentication
- Uses token from OTP verification

**2. Get Order Details**
```bash
GET /retrieve_order?order_id={id}
Headers:
  Authorization: {token}  # From OTP verification, NOT API key
  user_id: {user_id}     # From OTP verification
```
- Private data (user's order)
- Requires user authentication
- Uses token from OTP verification

## Summary

| Endpoint | Authentication | Uses |
|----------|---------------|------|
| `/retrieve_brands` | API Key | `ALHOMAIDHI_API_KEY` |
| `/list_products` | API Key | `ALHOMAIDHI_API_KEY` |
| `/retrieve_product` | API Key | `ALHOMAIDHI_API_KEY` |
| `/list_orders` | Token | Token from OTP verification |
| `/retrieve_order` | Token | Token from OTP verification |

## Why We Need It

- **Product Search**: Users can search products without authentication
- **Brand Listing**: Users can see brands without authentication
- **Order Tracking**: Requires authentication (token from OTP)

The API key is for **public product/brand data**. Orders require **user authentication** via OTP.

