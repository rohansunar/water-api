# Vendor Service Database Integration Guide

## Overview

The vendor service has been migrated from using mock data to a full database integration using Prisma ORM with PostgreSQL. This document outlines the schema changes, new database models, relationships, configuration requirements, and setup instructions.

## Schema Changes

### Before: Mock Data Implementation
- Vendor data was hardcoded in memory
- No persistent storage
- Limited scalability and data consistency
- No relationships between entities

### After: Database Integration
- Full CRUD operations using Prisma ORM
- PostgreSQL database with proper schema
- Data persistence and consistency
- Complex relationships between entities
- Transaction support and data integrity

## Database Models Used

### Core Vendor Models

#### 1. Vendor Model
```sql
-- Primary vendor information
CREATE TABLE "vendors" (
    "id" BIGSERIAL PRIMARY KEY,
    "phone" TEXT UNIQUE,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "bankAccountId" BIGINT,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "isVerified" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMPTZ,
    "metadata" JSONB
);
```

**Key Fields:**
- `id`: Primary key (BigInt)
- `phone`/`email`: Unique contact information
- `name`: Business name
- `gstin`: GST identification number
- `rating`: Vendor rating (0-5 scale)
- `isActive`/`isVerified`: Status flags

#### 2. VendorStore Model
```sql
-- Store information for each vendor
CREATE TABLE "vendor_stores" (
    "id" BIGSERIAL PRIMARY KEY,
    "vendorId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "activeHours" JSONB,
    "rating" DECIMAL(3,2) DEFAULT 4.0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE
);
```

**Key Fields:**
- `vendorId`: Foreign key to Vendor
- `activeHours`: JSON object with day-wise operating hours
- `address`/`phone`: Store contact information

#### 3. VendorAddress Model
```sql
-- Address information for vendors
CREATE TABLE "vendor_addresses" (
    "id" BIGSERIAL PRIMARY KEY,
    "vendorId" BIGINT NOT NULL,
    "label" TEXT DEFAULT 'Store',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE
);
```

### Product Management Models

#### 4. Product Model
```sql
-- Product catalog
CREATE TABLE "products" (
    "id" BIGSERIAL PRIMARY KEY,
    "vendorId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "capacity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" INTEGER DEFAULT 0,
    "isAvailable" BOOLEAN DEFAULT true,
    "stockQuantity" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT false,
    "minOrderQuantity" INTEGER DEFAULT 1,
    "maxOrderQuantity" INTEGER DEFAULT 1000,
    "areaPincodes" TEXT[],
    "images" TEXT[],
    "specifications" JSONB,
    "hasDeposit" BOOLEAN DEFAULT false,
    "depositAmount" DECIMAL(10,2) DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE
);
```

**Key Fields:**
- `vendorId`: Foreign key to Vendor
- `areaPincodes`: Array of pincodes where product is available
- `specifications`: JSON object for product details
- `hasDeposit`/`depositAmount`: Deposit configuration

#### 5. ProductStoreMapping Model
```sql
-- Product availability in specific stores
CREATE TABLE "product_store_mapping" (
    "id" BIGSERIAL PRIMARY KEY,
    "productId" BIGINT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "price" DECIMAL(10,2),
    "stockQuantity" INTEGER DEFAULT 0,
    "reservedStock" INTEGER DEFAULT 0,
    "isAvailable" BOOLEAN DEFAULT true,
    "areaPincodes" TEXT[] DEFAULT [],
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
    FOREIGN KEY ("storeId") REFERENCES "vendor_stores"("id") ON DELETE CASCADE,

    UNIQUE("productId", "storeId")
);
```

**Key Fields:**
- `stockQuantity`/`reservedStock`: Inventory management
- `areaPincodes`: Store-specific delivery areas

### Order Management Models

#### 6. Order Model
```sql
-- Order information
CREATE TABLE "orders" (
    "id" BIGINT,
    "orderUuid" TEXT UNIQUE DEFAULT uuid(),
    "customerId" BIGINT NOT NULL,
    "vendorId" BIGINT,
    "storeId" BIGINT,
    "riderId" BIGINT,
    "addressId" BIGINT NOT NULL,
    "orderNumber" TEXT UNIQUE,
    "status" TEXT DEFAULT 'placed',
    "subtotal" DECIMAL(10,2),
    "deliveryFee" DECIMAL(8,2) DEFAULT 0,
    "taxAmount" DECIMAL(8,2) DEFAULT 0,
    "totalAmount" DECIMAL(10,2),
    "paymentMethod" TEXT DEFAULT 'cash',
    "paymentStatus" TEXT DEFAULT 'pending',
    "deliveryInstructions" TEXT,
    "scheduledDelivery" TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "subscriptionId" BIGINT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id", "createdAt"),

    FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
    FOREIGN KEY ("vendorId") REFERENCES "vendors"("id"),
    FOREIGN KEY ("storeId") REFERENCES "vendor_stores"("id"),
    FOREIGN KEY ("riderId") REFERENCES "riders"("id"),
    FOREIGN KEY ("addressId") REFERENCES "customer_addresses"("id"),
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
);
```

#### 7. OrderItem Model
```sql
-- Individual items within orders
CREATE TABLE "order_items" (
    "id" BIGSERIAL PRIMARY KEY,
    "orderId" BIGINT NOT NULL,
    "orderCreatedAt" TIMESTAMPTZ NOT NULL,
    "productId" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2),
    "productSnapshot" JSONB,

    FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "orders"("id", "createdAt") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "products"("id")
);
```

### Customer Models

#### 8. Customer Model
```sql
-- Customer information
CREATE TABLE "customers" (
    "id" BIGSERIAL PRIMARY KEY,
    "uuid" TEXT UNIQUE DEFAULT uuid(),
    "phone" TEXT UNIQUE,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT,
    "name" TEXT,
    "walletBalance" DECIMAL(10,2) DEFAULT 0,
    "role" TEXT DEFAULT 'CUSTOMER',
    "loyaltyPoints" INTEGER DEFAULT 0,
    "preferences" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "monthlyPaymentMode" BOOLEAN DEFAULT false,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMPTZ
);
```

#### 9. CustomerAddress Model
```sql
-- Customer address information
CREATE TABLE "customer_addresses" (
    "id" BIGSERIAL PRIMARY KEY,
    "customerId" BIGINT NOT NULL,
    "type" TEXT DEFAULT 'HOME',
    "street" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT NOT NULL,
    "landmark" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE
);
```

## Database Relationships

### Entity Relationship Diagram

```
Vendor (1) ──── (M) VendorStore
   │                    │
   ├─── (M) VendorAddress │
   │                      │
   ├─── (M) Product ──────┼─── (M) ProductStoreMapping
   │                      │
   ├─── (M) Order ───────┼─── (M) OrderItem
   │                      │
   └─── (M) Customer ────┼─── (M) CustomerAddress
```

### Key Relationships

1. **Vendor → VendorStore**: One-to-many (vendor can have multiple stores)
2. **Vendor → VendorAddress**: One-to-many (vendor can have multiple addresses)
3. **Vendor → Product**: One-to-many (vendor can have multiple products)
4. **Product → ProductStoreMapping**: One-to-many (product can be in multiple stores)
5. **VendorStore → ProductStoreMapping**: One-to-many (store can have multiple products)
6. **Vendor → Order**: One-to-many (vendor can have multiple orders)
7. **Order → OrderItem**: One-to-many (order can have multiple items)
8. **Customer → Order**: One-to-many (customer can place multiple orders)
9. **Customer → CustomerAddress**: One-to-many (customer can have multiple addresses)

## Configuration Changes

### Environment Variables Required

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/water_jar_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ADMIN_SECRET=your-admin-jwt-secret-here

# Application Configuration
PORT=3000
NODE_ENV=development

# Optional Configuration
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Database Connection Configuration

The application uses PrismaService with the following features:

- **Connection Pooling**: Automatic connection pooling via Prisma
- **Health Monitoring**: 30-second health checks with automatic recovery
- **Connection Monitoring**: 5-second connection state checks
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Comprehensive error logging and recovery

## Migration Requirements

### Prisma Migrations

The project includes several migration files in `prisma/migrations/`:

1. **20250923213657_update_to_optimal_schema**: Initial schema setup
2. **20250924175334_add_audit_log_table**: Audit logging capabilities
3. **20250925124934_add_vendor_system_tables**: Vendor-specific tables

### Running Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run pending migrations
npx prisma migrate deploy

# Create new migration (if schema changes)
npx prisma migrate dev --name your_migration_name

# Reset database (development only)
npx prisma migrate reset
```

### Migration Order

1. Ensure PostgreSQL database is running
2. Set `DATABASE_URL` environment variable
3. Run `npx prisma migrate deploy`
4. Run `npx prisma generate` to update client

## Setup Instructions

### 1. Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb water_jar_db

# Create user (optional)
sudo -u postgres createuser --interactive --pwprompt water_user
```

### 2. Environment Configuration

Create `.env` file in project root:

```env
DATABASE_URL=postgresql://water_user:password@localhost:5432/water_jar_db
JWT_SECRET=your-256-bit-secret-here
JWT_ADMIN_SECRET=your-admin-secret-here
PORT=3000
NODE_ENV=development
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (if available)
npm run seed:admin
```

### 5. Start Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Database Operations in Vendor Service

### Key Database Operations Implemented

#### Vendor Management
- `findById()`: Retrieve vendor by ID with stores and addresses
- `findByUserId()`: Find vendor by phone/email
- `findByLocation()`: Location-based vendor search
- `create()`: Create new vendor profile
- `getAllVendors()`: List all active vendors

#### Store Management
- `getStoreDetails()`: Retrieve store information
- `updateStore()`: Update store details
- `createStoreHours()`: Set operating hours
- `updateStoreHours()`: Modify operating hours
- `updateStoreStatus()`: Open/close store

#### Product Management
- `getVendorProducts()`: List vendor's products
- `createProduct()`: Add new product
- `updateProductStock()`: Update inventory
- `getProductVariants()`: Manage product variants
- `bulkProductOperations()`: Batch product updates

#### Order Management
- `getVendorOrders()`: Retrieve vendor's orders
- `updateOrderStatus()`: Change order status
- `getPendingOrders()`: List pending orders
- `acceptOrder()`: Accept order
- `rejectOrder()`: Reject order

#### Analytics & Reporting
- `getSalesAnalytics()`: Sales performance data
- `getProductPerformance()`: Product analytics
- `getCustomerInsights()`: Customer behavior analysis
- `getDailyReport()`: Daily business summary
- `getMonthlyReport()`: Monthly performance report

#### Inventory Management
- `getInventoryStatus()`: Current stock levels
- `updateInventory()`: Modify stock quantities
- `adjustInventory()`: Stock adjustments
- `getLowStockAlerts()`: Inventory alerts

## Performance Considerations

### Database Indexes

The schema includes performance indexes on:

- Vendor lookups: `idx_vendors_user_id`, `idx_vendors_is_active`
- Store operations: `idx_stores_vendor_id`, `idx_stores_is_active`
- Product searches: `idx_products_vendor_id`, `idx_products_category`, `idx_products_is_active`
- Order queries: Composite primary key on `(id, createdAt)`
- Inventory management: Store and product mapping indexes

### Query Optimization

- **Include/Select**: Only fetch required fields
- **Pagination**: Implemented on large datasets
- **Indexing**: Strategic indexes for common queries
- **Connection Pooling**: Prisma handles connection pooling
- **Caching**: Consider Redis for frequently accessed data

## Error Handling

### Database Error Types

- **Connection Errors**: Automatic retry with exponential backoff
- **Constraint Violations**: Proper validation and error messages
- **Foreign Key Errors**: Cascade deletes and referential integrity
- **Timeout Errors**: Configurable timeouts and retry logic

### Error Response Format

```json
{
  "statusCode": 500,
  "message": "Database operation failed",
  "error": "Internal Server Error"
}
```

## Monitoring & Maintenance

### Health Checks

The PrismaService includes:
- **Health Monitoring**: 30-second connectivity checks
- **Connection Monitoring**: 5-second state checks
- **Automatic Recovery**: Reconnection on failures
- **Logging**: Comprehensive error and performance logging

### Database Maintenance

```bash
# View migration status
npx prisma migrate status

# Create backup
pg_dump water_jar_db > backup.sql

# Restore from backup
psql water_jar_db < backup.sql

# Database cleanup (remove old data)
# Implement based on retention policies
```

## Security Considerations

### Database Security

- **Parameterized Queries**: Prisma prevents SQL injection
- **Connection Encryption**: SSL/TLS for production
- **Access Control**: Row-level security where applicable
- **Audit Logging**: Track all data modifications

### Environment Security

- **Secret Management**: Secure JWT secrets
- **Database Credentials**: Encrypted connection strings
- **Network Security**: Database behind firewall/VPC
- **Backup Security**: Encrypted database backups

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check PostgreSQL is running
   - Verify DATABASE_URL format
   - Ensure database exists

2. **Migration Errors**
   - Check migration order
   - Verify schema compatibility
   - Review migration logs

3. **Performance Issues**
   - Check database indexes
   - Monitor query performance
   - Consider connection pooling

4. **Data Consistency**
   - Verify foreign key constraints
   - Check transaction boundaries
   - Review cascade delete rules

### Debug Commands

```bash
# View database logs
tail -f /var/log/postgresql/postgresql-*.log

# Check active connections
SELECT * FROM pg_stat_activity;

# Analyze slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC;

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Future Enhancements

### Planned Improvements

1. **Database Sharding**: Horizontal scaling for large datasets
2. **Read Replicas**: Separate read/write workloads
3. **Caching Layer**: Redis for frequently accessed data
4. **Advanced Analytics**: Real-time analytics capabilities
5. **Backup Automation**: Automated backup and recovery
6. **Performance Monitoring**: Advanced query analysis tools

### Schema Extensions

Potential future additions:
- **VendorStaff**: Staff management for vendors
- **ProductVariants**: Advanced product variant system
- **InventoryTracking**: Detailed inventory movement logs
- **PromotionSystem**: Discount and promotion management
- **ReviewSystem**: Customer reviews and ratings

---

## Conclusion

The vendor service database integration provides a robust, scalable foundation for vendor operations. The schema supports complex relationships, ensures data integrity, and provides excellent performance for typical vendor workflows.

Key benefits of the database integration:
- **Data Persistence**: Reliable data storage and retrieval
- **Scalability**: Support for growing vendor and product catalogs
- **Consistency**: ACID transactions and referential integrity
- **Performance**: Optimized queries with proper indexing
- **Maintainability**: Clear schema structure and relationships

For any issues or questions regarding the database integration, refer to the troubleshooting section or consult the development team.