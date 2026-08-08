-- =============================================================================
-- SOLUTECH BACKEND SERVICE - DATABASE DDL SCHEMA (POSTGRESQL)
-- =============================================================================

-- 1. CREATE MULTI-SCHEMA
CREATE SCHEMA IF NOT EXISTS "master";
CREATE SCHEMA IF NOT EXISTS "product";
CREATE SCHEMA IF NOT EXISTS "transaction";

-- =============================================================================
-- 2. SCHEMA MASTER (Roles, Users, ApiClients)
-- =============================================================================

CREATE TYPE "master"."RoleName" AS ENUM ('ADMIN', 'USER');

CREATE TABLE "master"."roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" "master"."RoleName" NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "master"."users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL REFERENCES "master"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "master"."api_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL UNIQUE,
    "publicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "users_email_idx" ON "master"."users"("email");

-- =============================================================================
-- 3. SCHEMA PRODUCT (Products)
-- =============================================================================

CREATE TABLE "product"."products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "products_name_idx" ON "product"."products"("name");
CREATE INDEX "products_isDeleted_idx" ON "product"."products"("isDeleted");

-- =============================================================================
-- 4. SCHEMA TRANSACTION (Orders, OrderItems)
-- =============================================================================

CREATE TYPE "transaction"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "transaction"."orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "master"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "status" "transaction"."OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "transaction"."order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "transaction"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "product"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL
);

CREATE INDEX "orders_userId_idx" ON "transaction"."orders"("userId");
CREATE INDEX "order_items_orderId_idx" ON "transaction"."order_items"("orderId");
