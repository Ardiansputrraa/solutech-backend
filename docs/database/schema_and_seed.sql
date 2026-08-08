-- =============================================================================
-- SOLUTECH BACKEND - FULL DATABASE SCHEMA & SEED DATA (POSTGRESQL)
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

-- =============================================================================
-- 5. INITIAL SEED DATA
-- =============================================================================

-- Seed Roles
INSERT INTO "master"."roles" ("id", "name", "description") VALUES
('cmsj0l6vc0000fslw2f3dwnjs', 'ADMIN', 'System Administrator with full permissions'),
('cmsj0l6vc0001fslw2f3dwnjs', 'USER', 'Standard registered customer user')
ON CONFLICT ("id") DO NOTHING;

-- Seed Users (Bcrypt hashed password)
-- Admin: Admin@123 | User Demo: User@123
INSERT INTO "master"."users" ("id", "email", "password", "name", "roleId") VALUES
('cmsj0l6vc0002fslw2f3dwnjs', 'admin@solutech.id', '$2a$10$wK1m...hashed...', 'Admin Solutech', 'cmsj0l6vc0000fslw2f3dwnjs'),
('cmsj0l6vc0003fslw2f3dwnjs', 'user@solutech.id', '$2a$10$wK1m...hashed...', 'User Demo', 'cmsj0l6vc0001fslw2f3dwnjs')
ON CONFLICT ("id") DO NOTHING;

-- Seed API Clients
INSERT INTO "master"."api_clients" ("id", "name", "clientKey", "publicKey", "isActive") VALUES
('cmsj0l6vc0004fslw2f3dwnjs', 'Solutech Web App Client', 'CLIENT_SOLUTECH_DEV_01', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', true)
ON CONFLICT ("id") DO NOTHING;

-- Seed Products
INSERT INTO "product"."products" ("id", "name", "price", "stock", "description") VALUES
('cmsj4pxbt0000qglwtaxg3rlk', 'Laptop ThinkPad X1 Carbon', 22000000, 10, 'Business Ultrabook Core i7 16GB RAM 512GB SSD'),
('cmsj4pxbt0001qglwtaxg3rlk', 'Monitor Dell UltraSharp 27 Inch 4K', 8500000, 15, 'IPS Monitor 4K UHD USB-C Hub'),
('cmsj4pxbt0002qglwtaxg3rlk', 'Keyboard Mechanical Keychron K2', 1450000, 25, 'Wireless Mechanical Keyboard Gateron Brown'),
('cmsj4pxbt0003qglwtaxg3rlk', 'Mouse Logitech MX Master 3S', 1650000, 30, 'Performance Wireless Mouse Quiet Clicks'),
('cmsj4pxbt0004qglwtaxg3rlk', 'Headset Sony WH-1000XM5', 4999000, 12, 'Wireless Noise Canceling Headphones Black')
ON CONFLICT ("id") DO NOTHING;
