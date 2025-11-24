# Water Jar Delivery API 💧

A comprehensive backend API for water jar delivery platform built with NestJS, TypeScript, and PostgreSQL. This API provides complete functionality for on-demand and subscription-based water jar delivery services with Supabase Storage integration.

## 🚀 Features

### Core Functionality
- **JWT Authentication** with OTP-based login
- **Role-based Access Control** (Customer, Vendor, Delivery Agent)
- **Order Management** with real-time tracking
- **Subscription System** for recurring deliveries (modularized within customer module)
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

### Storage Features
- **Supabase Storage** with 50MB file size limit
- **Public/Private Access Control** for uploaded files
- **Signed URLs** for secure temporary access
- **Automatic Content-Type Detection**
- **CDN Integration** for global content delivery
- **Real-time File Synchronization**

## 🛠️ Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Supabase Storage (replaces AWS S3)
- **Authentication**: JWT with phone-based OTP
- **Validation**: class-validator & class-transformer
- **Testing**: Jest with Supertest
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, Throttler

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Supabase account and project
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a storage bucket named 'images' in the Storage section

### 4. Database Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb water_jar_db

# Create user (optional)
sudo -u postgres createuser --interactive --pwprompt water_user
```

### 5. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/water_jar_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ADMIN_SECRET=your-admin-jwt-secret-key
JWT_EXPIRES_IN=7d

# Supabase Storage Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_STORAGE_BUCKET=images
SUPABASE_PUBLIC_ACCESS=true

# Application
PORT=3000
NODE_ENV=development
```

### 6. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data
npm run seed:admin
```

### 7. Run the Application
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

### Subscription Management
```
GET    /api/customers/subscriptions        # Get customer subscriptions
POST   /api/customers/subscriptions        # Create new subscription
PUT    /api/customers/subscriptions/:id    # Update subscription
DELETE /api/customers/subscriptions/:id    # Cancel subscription
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
