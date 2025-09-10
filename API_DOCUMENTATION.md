# Water Jar Delivery API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success message",
  "timestamp": "2025-08-02T10:30:00.000Z"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Bad Request",
  "timestamp": "2025-08-02T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

## Endpoints

### Authentication

#### Send OTP
```http
POST /auth/login
Content-Type: application/json

{
  "phone": "9999999999"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully to your phone number",
  "success": true
}
```

#### Verify OTP
```http
POST /auth/verify
Content-Type: application/json

{
  "phone": "9999999999",
  "otp": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "phone": "9999999999",
    "name": "John Doe",
    "role": "customer",
    "walletBalance": 500
  }
}
```

### User Management

#### Get User Profile
```http
GET /user/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user-id",
  "phone": "9999999999",
  "name": "John Doe",
  "role": "customer",
  "walletBalance": 500,
  "addresses": [
    {
      "street": "123 Main St",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "contactPhone": "9999999999",
      "isDefault": true
    }
  ]
}
```

### Products & Vendors

#### Get Products by Location
```http
GET /vendors/{location}/products
```

**Response:**
```json
[
  {
    "id": "product-id",
    "name": "Pure Water Jar 20L",
    "description": "Premium quality drinking water",
    "category": "water_jars",
    "price": 50,
    "capacity": "20L",
    "unit": "jar",
    "stock": 100,
    "isAvailable": true,
    "vendor": {
      "id": "vendor-id",
      "businessName": "Pure Water Co.",
      "rating": 4.5
    }
  }
]
```

#### Get Product Details
```http
GET /products/{productId}
```

### Order Management

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product-id",
  "quantity": 2,
  "schedule": "instant",
  "paymentMethod": "wallet",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "contactPhone": "9999999999"
  }
}
```

**Response:**
```json
{
  "id": "order-id",
  "userId": "user-id",
  "productId": "product-id",
  "quantity": 2,
  "totalAmount": 100,
  "status": "pending",
  "paymentMethod": "wallet",
  "paymentStatus": "completed",
  "deliveryAddress": {...},
  "createdAt": "2025-08-02T10:30:00.000Z"
}
```

#### Get User Orders
```http
GET /orders
Authorization: Bearer <token>
```

#### Get Order Details
```http
GET /orders/{orderId}
Authorization: Bearer <token>
```

#### Cancel Order
```http
DELETE /orders/{orderId}
Authorization: Bearer <token>
```

### Subscription Management

#### Create Subscription
```http
POST /subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product-id",
  "quantity": 1,
  "frequency": "weekly",
  "startDate": "2025-08-02",
  "deliveryAddress": {...}
}
```

#### Get User Subscriptions
```http
GET /subscriptions
Authorization: Bearer <token>
```

#### Update Subscription
```http
PUT /subscriptions/{subscriptionId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 2,
  "frequency": "daily"
}
```

#### Cancel Subscription
```http
DELETE /subscriptions/{subscriptionId}
Authorization: Bearer <token>
```

### Wallet Management

#### Get Wallet Balance
```http
GET /wallet
Authorization: Bearer <token>
```

**Response:**
```json
{
  "balance": 500,
  "userId": "user-id"
}
```

#### Add Money to Wallet
```http
POST /wallet/topup
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 200,
  "paymentMethod": "UPI"
}
```

#### Get Transaction History
```http
GET /wallet/transactions
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "transaction-id",
    "type": "credit",
    "amount": 200,
    "status": "completed",
    "description": "Money added to wallet",
    "paymentMethod": "UPI",
    "createdAt": "2025-08-02T10:30:00.000Z"
  }
]
```

### Complaints & Feedback

#### Create Complaint
```http
POST /complaints
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "delivery_issue",
  "subject": "Late delivery",
  "message": "My order was delivered 2 hours late",
  "orderId": "order-id"
}
```

**Response:**
```json
{
  "id": "complaint-id",
  "userId": "user-id",
  "type": "delivery_issue",
  "subject": "Late delivery",
  "message": "My order was delivered 2 hours late",
  "status": "open",
  "priority": "high",
  "orderId": "order-id",
  "createdAt": "2025-08-02T10:30:00.000Z"
}
```

#### Get User Complaints
```http
GET /complaints
Authorization: Bearer <token>
```

#### Get Complaint Details
```http
GET /complaints/{complaintId}
Authorization: Bearer <token>
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

- **General endpoints**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **Rate limit headers** are included in responses:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Data Types

### User Roles
- `customer` - Regular customer
- `vendor` - Water jar vendor
- `delivery_agent` - Delivery personnel

### Order Status
- `pending` - Order placed, awaiting processing
- `confirmed` - Order confirmed by vendor
- `preparing` - Order being prepared
- `out_for_delivery` - Order dispatched
- `delivered` - Order delivered successfully
- `cancelled` - Order cancelled

### Payment Methods
- `wallet` - Digital wallet payment
- `cod` - Cash on delivery
- `online` - Online payment gateway

### Complaint Types
- `delivery_issue` - Delivery related problems
- `product_quality` - Product quality issues
- `billing_issue` - Billing and payment problems
- `service_issue` - General service issues
- `payment_issue` - Payment related problems
- `general_inquiry` - General questions
- `feedback` - Customer feedback

### Subscription Frequencies
- `daily` - Daily delivery
- `weekly` - Weekly delivery
- `monthly` - Monthly delivery

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## CORS Policy

The API supports CORS for the following origins:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8080`
- Environment-specific frontend URLs
