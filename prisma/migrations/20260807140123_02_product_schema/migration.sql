-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "product";

-- CreateTable
CREATE TABLE "product"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_name_idx" ON "product"."products"("name");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "product"."products"("deletedAt");
