# Water Jar Delivery API 💧

A comprehensive backend API for water jar delivery platform built with NestJS, TypeScript, and MongoDB. This API provides complete functionality for on-demand and subscription-based water jar delivery services.

## 🚀 Features

### Core Functionality
- **JWT Authentication** with OTP-based login
- **Role-based Access Control** (Customer, Vendor, Delivery Agent)
- **Order Management** with real-time tracking
- **Subscription System** for recurring deliveries
- **Digital Wallet** with transaction history
- **Complaint Management** with priority assignment
- **Location-based Services** with geospatial queries
- **Comprehensive Logging** with file rotation

### Security & Performance
- **Rate Limiting** and DDoS protection
- **Input Validation** with custom validators
- **Security Headers** (HSTS, CSP, XSS protection)
- **Request Tracing** for debugging
- **Performance Monitoring** with slow query detection

## 🛠️ Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with phone-based OTP
- **Validation**: class-validator & class-transformer
- **Testing**: Jest with Supertest
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, Throttler

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/water-jar-delivery

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Application
PORT=3000
NODE_ENV=development
```

### 3. Run the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/login      # Send OTP to phone number
POST /api/auth/verify     # Verify OTP and get JWT token
```

### User Management
```
GET  /api/user/me         # Get current user profile
PUT  /api/user/me         # Update user profile
```

### Order Management
```
POST   /api/orders        # Create new order
GET    /api/orders        # Get user orders
GET    /api/orders/:id    # Get order details
DELETE /api/orders/:id    # Cancel order
```

### Wallet Management
```
GET  /api/wallet              # Get wallet balance
POST /api/wallet/topup        # Add money to wallet
GET  /api/wallet/transactions # Get transaction history
```

### Complaints & Feedback
```
POST /api/complaints     # Create complaint
GET  /api/complaints     # Get user complaints
GET  /api/complaints/:id # Get complaint details
```

## 🔒 Security Features

- **JWT Authentication** with secure token generation
- **Rate Limiting** (100 requests per minute per IP)
- **Input Validation** with comprehensive DTOs
- **Security Headers** (HSTS, CSP, XSS protection)
- **CORS Configuration** for cross-origin requests

## 📊 Monitoring & Logging

### Log Files
- `logs/application-YYYY-MM-DD.log` - General application logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/http-YYYY-MM-DD.log` - HTTP request logs

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

## 📝 License

This project is licensed under the MIT License.

---

**Built with ❤️ using NestJS and TypeScript**
