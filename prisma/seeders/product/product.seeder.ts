import type { PrismaClient } from "../../../src/generated/prisma";
import { productData } from "./product.data";

/**
 * Seed tabel `products`.
 *
 * Strategi: `findFirst` + conditional `create` / `update`
 *
 * @param prisma - Instance PrismaClient yang aktif
 * @returns Array of seeded products
 */
export async function seedProducts(prisma: PrismaClient) {
  console.log("  → Seeding products...");

  const seededProducts = [];

  for (const product of productData) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
      select: { id: true, name: true, deletedAt: true },
    });

    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: product.price,
          stock: product.stock,
          description: product.description ?? null,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          deletedAt: true,
        },
      });
      seededProducts.push({ ...updated, action: "updated" });
    } else {
      const created = await prisma.product.create({
        data: {
          name: product.name,
          price: product.price,
          stock: product.stock,
          description: product.description ?? null,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
        },
      });
      seededProducts.push({ ...created, action: "created" });
    }
  }

  const created = seededProducts.filter((p) => p.action === "created").length;
  const updated = seededProducts.filter((p) => p.action === "updated").length;

  console.log(
    `  ✓ ${seededProducts.length} products seeded (${created} created, ${updated} updated)`
  );

  return seededProducts;
}
