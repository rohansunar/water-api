-- Create vendor system tables
-- Note: Dropping existing tables to match the requested schema structure

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS "public"."delivery_tasks" CASCADE;
DROP TABLE IF EXISTS "public"."vendor_staff" CASCADE;
DROP TABLE IF EXISTS "public"."product_store_mapping" CASCADE;
DROP TABLE IF EXISTS "public"."product_variants" CASCADE;
DROP TABLE IF EXISTS "public"."commission_rules" CASCADE;
DROP TABLE IF EXISTS "public"."products" CASCADE;
DROP TABLE IF EXISTS "public"."stores" CASCADE;
DROP TABLE IF EXISTS "public"."vendors" CASCADE;

-- 1. vendors table
CREATE TABLE "public"."vendors" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "business_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- 2. stores table
CREATE TABLE "public"."stores" (
    "id" BIGSERIAL NOT NULL,
    "vendor_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "active_hours" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- 3. products table
CREATE TABLE "public"."products" (
    "id" BIGSERIAL NOT NULL,
    "vendor_id" BIGINT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "attributes" JSONB,
    "base_price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- 4. product_variants table
CREATE TABLE "public"."product_variants" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "variant_sku" TEXT NOT NULL,
    "attributes" JSONB,
    "price_override" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- 5. product_store_mapping table
CREATE TABLE "public"."product_store_mapping" (
    "id" BIGSERIAL NOT NULL,
    "product_variant_id" BIGINT NOT NULL,
    "store_id" BIGINT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "area_pincodes" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_store_mapping_pkey" PRIMARY KEY ("id")
);

-- 6. vendor_staff table
CREATE TABLE "public"."vendor_staff" (
    "id" BIGSERIAL NOT NULL,
    "vendor_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_staff_pkey" PRIMARY KEY ("id")
);

-- 7. delivery_tasks table
CREATE TABLE "public"."delivery_tasks" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "vendor_id" BIGINT NOT NULL,
    "store_id" BIGINT NOT NULL,
    "staff_id" BIGINT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_tasks_pkey" PRIMARY KEY ("id")
);

-- 8. commission_rules table
CREATE TABLE "public"."commission_rules" (
    "id" BIGSERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "scope_id" BIGINT,
    "percentage" DECIMAL(5,2) NOT NULL,
    "fixed_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
-- Note: Using existing table references based on current schema
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."stores" ADD CONSTRAINT "stores_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_store_mapping" ADD CONSTRAINT "product_store_mapping_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_store_mapping" ADD CONSTRAINT "product_store_mapping_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."vendor_staff" ADD CONSTRAINT "vendor_staff_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Removed foreign key constraint for orders table due to composite primary key (id, createdAt)
-- ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."vendor_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraints
CREATE UNIQUE INDEX "vendors_email_key" ON "public"."vendors"("email");
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");
CREATE UNIQUE INDEX "product_variants_variant_sku_key" ON "public"."product_variants"("variant_sku");
CREATE UNIQUE INDEX "product_store_mapping_product_variant_id_store_id_key" ON "public"."product_store_mapping"("product_variant_id", "store_id");

-- Add performance indexes
CREATE INDEX "idx_vendors_user_id" ON "public"."vendors"("user_id");
CREATE INDEX "idx_vendors_is_active" ON "public"."vendors"("is_active");

CREATE INDEX "idx_stores_vendor_id" ON "public"."stores"("vendor_id");
CREATE INDEX "idx_stores_is_active" ON "public"."stores"("is_active");

CREATE INDEX "idx_products_vendor_id" ON "public"."products"("vendor_id");
CREATE INDEX "idx_products_sku" ON "public"."products"("sku");
CREATE INDEX "idx_products_category" ON "public"."products"("category");
CREATE INDEX "idx_products_is_active" ON "public"."products"("is_active");

CREATE INDEX "idx_product_variants_product_id" ON "public"."product_variants"("product_id");
CREATE INDEX "idx_product_variants_is_active" ON "public"."product_variants"("is_active");

CREATE INDEX "idx_product_store_mapping_store_id" ON "public"."product_store_mapping"("store_id");
CREATE INDEX "idx_product_store_mapping_is_active" ON "public"."product_store_mapping"("is_active");

CREATE INDEX "idx_vendor_staff_vendor_id" ON "public"."vendor_staff"("vendor_id");
CREATE INDEX "idx_vendor_staff_is_active" ON "public"."vendor_staff"("is_active");

CREATE INDEX "idx_delivery_tasks_vendor_id" ON "public"."delivery_tasks"("vendor_id");
CREATE INDEX "idx_delivery_tasks_store_id" ON "public"."delivery_tasks"("store_id");
CREATE INDEX "idx_delivery_tasks_staff_id" ON "public"."delivery_tasks"("staff_id");
CREATE INDEX "idx_delivery_tasks_status" ON "public"."delivery_tasks"("status");

CREATE INDEX "idx_commission_rules_scope" ON "public"."commission_rules"("scope");
CREATE INDEX "idx_commission_rules_scope_id" ON "public"."commission_rules"("scope_id");
CREATE INDEX "idx_commission_rules_is_active" ON "public"."commission_rules"("is_active");
CREATE INDEX "idx_commission_rules_priority" ON "public"."commission_rules"("priority");