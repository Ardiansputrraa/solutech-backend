-- AlterTable
ALTER TABLE "product"."products" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_is_deleted_idx" ON "product"."products"("is_deleted");
