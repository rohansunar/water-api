/*
  Warnings:

  - You are about to drop the column `created_at` on the `commission_rules` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_amount` on the `commission_rules` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `commission_rules` table. All the data in the column will be lost.
  - You are about to drop the column `scope_id` on the `commission_rules` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `commission_rules` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `line1` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `line2` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `staff_id` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `store_id` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `delivery_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `productStoreId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayResponse` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayTransactionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccountId` on the `payouts` table. All the data in the column will be lost.
  - You are about to drop the column `initiatedAt` on the `payouts` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `payouts` table. All the data in the column will be lost.
  - You are about to drop the column `area_pincodes` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `product_variant_id` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `reserved` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `store_id` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `product_store_mapping` table. All the data in the column will be lost.
  - You are about to drop the column `attributes` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `base_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryDays` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `frequencyType` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `frequencyValue` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `preferredDeliveryTime` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `products` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `vendor_staff` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `vendor_staff` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `vendor_staff` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `vendor_staff` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `business_name` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the `agents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_variants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stores` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderId,orderCreatedAt]` on the table `delivery_tasks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,storeId]` on the table `product_store_mapping` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `vendor_staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `vendor_staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `vendor_staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `vendors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `commission_rules` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `scope` on the `commission_rules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `street` to the `customer_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `customer_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `orderCreatedAt` to the `delivery_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `delivery_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riderId` to the `delivery_tasks` table without a default value. This is not possible if the table is not empty.
  - Made the column `balanceAfter` on table `ledger_entries` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `productId` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `method` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `product_store_mapping` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `product_store_mapping` table without a default value. This is not possible if the table is not empty.
  - Added the required column `capacity` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `frequency` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `vendor_staff` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `vendorId` to the `vendor_staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CommissionScope" AS ENUM ('GLOBAL', 'CATEGORY', 'VENDOR', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."ProductModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'DELIVERY_RIDER', 'ADMIN');

-- DropForeignKey
ALTER TABLE "public"."delivery_tasks" DROP CONSTRAINT "delivery_tasks_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."delivery_tasks" DROP CONSTRAINT "delivery_tasks_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."delivery_tasks" DROP CONSTRAINT "delivery_tasks_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_store_mapping" DROP CONSTRAINT "product_store_mapping_product_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_store_mapping" DROP CONSTRAINT "product_store_mapping_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stores" DROP CONSTRAINT "stores_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_addressId_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_storeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."vendor_staff" DROP CONSTRAINT "vendor_staff_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stores" DROP CONSTRAINT "stores_addressId_fkey";

-- DropForeignKey
ALTER TABLE "public"."vendors" DROP CONSTRAINT "vendors_user_id_fkey";

-- DropIndex
DROP INDEX "public"."idx_commission_rules_is_active";

-- DropIndex
DROP INDEX "public"."idx_commission_rules_priority";

-- DropIndex
DROP INDEX "public"."idx_commission_rules_scope";

-- DropIndex
DROP INDEX "public"."idx_commission_rules_scope_id";

-- DropIndex
DROP INDEX "public"."idx_delivery_tasks_staff_id";

-- DropIndex
DROP INDEX "public"."idx_delivery_tasks_status";

-- DropIndex
DROP INDEX "public"."idx_delivery_tasks_store_id";

-- DropIndex
DROP INDEX "public"."idx_delivery_tasks_vendor_id";

-- DropIndex
DROP INDEX "public"."idx_product_store_mapping_is_active";

-- DropIndex
DROP INDEX "public"."idx_product_store_mapping_store_id";

-- DropIndex
DROP INDEX "public"."product_store_mapping_product_variant_id_store_id_key";

-- DropIndex
DROP INDEX "public"."idx_products_category";

-- DropIndex
DROP INDEX "public"."idx_products_is_active";

-- DropIndex
DROP INDEX "public"."idx_products_sku";

-- DropIndex
DROP INDEX "public"."idx_products_vendor_id";

-- DropIndex
DROP INDEX "public"."products_sku_key";

-- DropIndex
DROP INDEX "public"."idx_vendor_staff_is_active";

-- DropIndex
DROP INDEX "public"."idx_vendor_staff_vendor_id";

-- DropIndex
DROP INDEX "public"."idx_vendors_is_active";

-- DropIndex
DROP INDEX "public"."idx_vendors_user_id";

-- AlterTable
ALTER TABLE "public"."commission_rules" DROP COLUMN "created_at",
DROP COLUMN "fixed_amount",
DROP COLUMN "is_active",
DROP COLUMN "scope_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" BIGINT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scopeId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "scope",
ADD COLUMN     "scope" "public"."CommissionScope" NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."customer_addresses" DROP COLUMN "country",
DROP COLUMN "label",
DROP COLUMN "line1",
DROP COLUMN "line2",
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "street" TEXT NOT NULL,
ADD COLUMN     "type" "public"."AddressType" NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "monthlyPaymentMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "public"."UserRole" NOT NULL,
ADD COLUMN     "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."delivery_tasks" DROP COLUMN "created_at",
DROP COLUMN "order_id",
DROP COLUMN "staff_id",
DROP COLUMN "store_id",
DROP COLUMN "updated_at",
DROP COLUMN "vendor_id",
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerId" BIGINT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "location" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "orderCreatedAt" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "orderId" BIGINT NOT NULL,
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "riderId" BIGINT NOT NULL,
ADD COLUMN     "vendorId" BIGINT;

-- AlterTable
ALTER TABLE "public"."ledger_entries" ADD COLUMN     "description" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" BIGINT,
ALTER COLUMN "balanceAfter" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."order_items" DROP COLUMN "productName",
DROP COLUMN "productStoreId",
ADD COLUMN     "productId" BIGINT NOT NULL,
ADD COLUMN     "productSnapshot" JSONB,
ADD COLUMN     "productStoreMappingId" BIGINT,
ALTER COLUMN "totalPrice" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "agentId",
ADD COLUMN     "riderId" BIGINT;

-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "gatewayResponse",
DROP COLUMN "gatewayTransactionId",
DROP COLUMN "paymentMethod",
ADD COLUMN     "failedAt" TIMESTAMPTZ,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "method" TEXT NOT NULL,
ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."payouts" DROP COLUMN "bankAccountId",
DROP COLUMN "initiatedAt",
DROP COLUMN "reference",
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "payoutDetails" JSONB,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "public"."product_store_mapping" DROP COLUMN "area_pincodes",
DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "product_variant_id",
DROP COLUMN "reserved",
DROP COLUMN "stock",
DROP COLUMN "store_id",
DROP COLUMN "updated_at",
ADD COLUMN     "areaPincodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "productId" BIGINT NOT NULL,
ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storeId" BIGINT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "attributes",
DROP COLUMN "base_price",
DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "sku",
DROP COLUMN "title",
DROP COLUMN "updated_at",
DROP COLUMN "vendor_id",
ADD COLUMN     "areaPincodes" TEXT[],
ADD COLUMN     "autoFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "capacity" TEXT NOT NULL,
ADD COLUMN     "complianceIssues" JSONB,
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "flaggedReason" TEXT,
ADD COLUMN     "hasDeposit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxOrderQuantity" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "moderatedAt" TIMESTAMPTZ,
ADD COLUMN     "moderatedBy" BIGINT,
ADD COLUMN     "moderationStatus" "public"."ProductModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vendorId" BIGINT NOT NULL,
ALTER COLUMN "category" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."subscriptions" DROP COLUMN "addressId",
DROP COLUMN "deliveryDays",
DROP COLUMN "frequencyType",
DROP COLUMN "frequencyValue",
DROP COLUMN "name",
DROP COLUMN "preferredDeliveryTime",
DROP COLUMN "products",
DROP COLUMN "storeId",
DROP COLUMN "updatedAt",
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "deliveryAddress" JSONB,
ADD COLUMN     "frequency" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "productId" BIGINT NOT NULL,
ADD COLUMN     "productSnapshot" JSONB,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "nextDeliveryDate" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."vendor_staff" DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "updated_at",
DROP COLUMN "vendor_id",
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMPTZ,
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD COLUMN     "vendorId" BIGINT NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."stores" DROP COLUMN "addressId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "rating" DECIMAL(3,2) NOT NULL DEFAULT 4.0,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vendorAddressId" BIGINT;

-- AlterTable
ALTER TABLE "public"."vendors" DROP COLUMN "address",
DROP COLUMN "business_name",
DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "bankAccountId" BIGINT,
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "lastActiveAt" TIMESTAMPTZ,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "rating" DECIMAL(3,2) DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "public"."agents";

-- DropTable
DROP TABLE "public"."product_variants";

-- DropTable
DROP TABLE "public"."stores";

-- CreateTable
CREATE TABLE "public"."cash_transactions" (
    "id" BIGSERIAL NOT NULL,
    "transactionUuid" TEXT NOT NULL,
    "orderId" BIGINT,
    "orderCreatedAt" TIMESTAMPTZ,
    "riderId" BIGINT,
    "vendorId" BIGINT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "notes" TEXT,
    "processedBy" BIGINT,
    "processedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_events" (
    "id" BIGSERIAL NOT NULL,
    "taskId" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "riderId" BIGINT,
    "location" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otp_codes" (
    "id" BIGSERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMPTZ,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outbox_events" (
    "id" BIGSERIAL NOT NULL,
    "eventUuid" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "orderCreatedAt" TIMESTAMPTZ NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refundMethod" TEXT,
    "transactionId" TEXT,
    "processedBy" BIGINT,
    "processedAt" TIMESTAMPTZ,
    "approvedBy" BIGINT,
    "approvedAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."riders" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "licenseNo" TEXT,
    "vehicleType" TEXT,
    "shift" JSONB,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "rating" DECIMAL(3,2) DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMPTZ,
    "metadata" JSONB,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_transactionUuid_key" ON "public"."cash_transactions"("transactionUuid");

-- CreateIndex
CREATE INDEX "otp_codes_phone_purpose_isUsed_expiresAt_idx" ON "public"."otp_codes"("phone", "purpose", "isUsed", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "otp_codes_phone_purpose_key" ON "public"."otp_codes"("phone", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_eventUuid_key" ON "public"."outbox_events"("eventUuid");

-- CreateIndex
CREATE UNIQUE INDEX "riders_uuid_key" ON "public"."riders"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "riders_phone_key" ON "public"."riders"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "riders_email_key" ON "public"."riders"("email");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_tasks_orderId_orderCreatedAt_key" ON "public"."delivery_tasks"("orderId", "orderCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_store_mapping_productId_storeId_key" ON "public"."product_store_mapping"("productId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_uuid_key" ON "public"."vendor_staff"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_phone_key" ON "public"."vendor_staff"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_email_key" ON "public"."vendor_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_phone_key" ON "public"."vendors"("phone");

-- AddForeignKey
ALTER TABLE "public"."cash_transactions" ADD CONSTRAINT "cash_transactions_orderId_orderCreatedAt_fkey" FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "public"."orders"("id", "createdAt") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_transactions" ADD CONSTRAINT "cash_transactions_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_transactions" ADD CONSTRAINT "cash_transactions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."commission_rules" ADD CONSTRAINT "commission_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_events" ADD CONSTRAINT "delivery_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."delivery_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_events" ADD CONSTRAINT "delivery_events_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_orderId_orderCreatedAt_fkey" FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "public"."orders"("id", "createdAt") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_productStoreMappingId_fkey" FOREIGN KEY ("productStoreMappingId") REFERENCES "public"."product_store_mapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payouts" ADD CONSTRAINT "payouts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_store_mapping" ADD CONSTRAINT "product_store_mapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_store_mapping" ADD CONSTRAINT "product_store_mapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_orderId_orderCreatedAt_fkey" FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "public"."orders"("id", "createdAt") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_staff" ADD CONSTRAINT "vendor_staff_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stores" ADD CONSTRAINT "stores_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stores" ADD CONSTRAINT "stores_vendorAddressId_fkey" FOREIGN KEY ("vendorAddressId") REFERENCES "public"."vendor_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
