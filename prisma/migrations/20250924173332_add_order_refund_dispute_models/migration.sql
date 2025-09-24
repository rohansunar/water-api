/*
  Warnings:

  - You are about to drop the column `agentId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `agents` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CommissionScope" AS ENUM ('GLOBAL', 'CATEGORY', 'VENDOR', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."ProductModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "public"."DisputePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."DisputeCategory" AS ENUM ('DELIVERY_DELAY', 'PRODUCT_QUALITY', 'WRONG_ITEM', 'MISSING_ITEM', 'PAYMENT_ISSUE', 'SERVICE_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EscalationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_agentId_fkey";

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "agentId",
ADD COLUMN     "riderId" BIGINT;

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "autoFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "complianceIssues" JSONB,
ADD COLUMN     "flaggedReason" TEXT,
ADD COLUMN     "moderatedAt" TIMESTAMPTZ,
ADD COLUMN     "moderatedBy" BIGINT,
ADD COLUMN     "moderationStatus" "public"."ProductModerationStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "public"."agents";

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

-- CreateTable
CREATE TABLE "public"."commission_rules" (
    "id" BIGSERIAL NOT NULL,
    "scope" "public"."CommissionScope" NOT NULL,
    "scopeId" TEXT,
    "percentage" DECIMAL(5,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."disputes" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "orderCreatedAt" TIMESTAMPTZ NOT NULL,
    "raisedBy" BIGINT NOT NULL,
    "raisedByType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."DisputePriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."DisputeCategory" NOT NULL,
    "evidence" JSONB,
    "resolution" TEXT,
    "resolvedBy" BIGINT,
    "resolvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."escalations" (
    "id" BIGSERIAL NOT NULL,
    "disputeId" BIGINT NOT NULL,
    "escalatedBy" BIGINT NOT NULL,
    "escalatedTo" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "public"."DisputePriority" NOT NULL DEFAULT 'HIGH',
    "status" "public"."EscalationStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" BIGINT,
    "resolvedAt" TIMESTAMPTZ,
    "resolution" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "riders_uuid_key" ON "public"."riders"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "riders_phone_key" ON "public"."riders"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "riders_email_key" ON "public"."riders"("email");

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."commission_rules" ADD CONSTRAINT "commission_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_orderId_orderCreatedAt_fkey" FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "public"."orders"("id", "createdAt") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_orderId_orderCreatedAt_fkey" FOREIGN KEY ("orderId", "orderCreatedAt") REFERENCES "public"."orders"("id", "createdAt") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escalations" ADD CONSTRAINT "escalations_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "public"."disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escalations" ADD CONSTRAINT "escalations_escalatedBy_fkey" FOREIGN KEY ("escalatedBy") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escalations" ADD CONSTRAINT "escalations_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
