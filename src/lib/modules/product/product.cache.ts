/**
 * product.cache.ts
 *
 * Konfigurasi cache, cache key builder, dan cache invalidation helper untuk modul Product.
 * Memisahkan logika caching dari business logic di service layer.
 */

import { delCache, delCachePattern } from "@/lib/redis";
import { type ProductQueryInput } from "./product.schema";
import logger from "@/lib/logger";

// ---------------------------------------------------------------------------
// Cache TTL Configuration
// ---------------------------------------------------------------------------

export const CACHE_TTL = {
  LIST: 300,   // 5 menit — data list berubah lebih sering (create/update/delete)
  DETAIL: 600, // 10 menit — data detail lebih jarang berubah
} as const;

// ---------------------------------------------------------------------------
// Cache Key Builders
// ---------------------------------------------------------------------------

/**
 * Membangun cache key unik untuk setiap kombinasi query daftar produk.
 * Format: products:list:page:{X}:limit:{Y}:search:{Z}
 */
export function buildListCacheKey(query: ProductQueryInput): string {
  return `products:list:page:${query.page}:limit:${query.limit}:search:${query.search ?? ""}`;
}

/**
 * Membangun cache key unik untuk detail satu produk berdasarkan ID.
 * Format: products:detail:{id}
 */
export function buildDetailCacheKey(id: string): string {
  return `products:detail:${id}`;
}

// ---------------------------------------------------------------------------
// Cache Invalidation Helper
// ---------------------------------------------------------------------------

/**
 * Invalidasi cache produk setelah operasi mutasi (create/update/delete).
 *
 * - Selalu invalidasi semua list cache (`products:list:*`).
 * - Jika `productId` disediakan, juga invalidasi detail cache produk tersebut.
 *
 * Error pada invalidasi tidak menggagalkan operasi utama — hanya dicatat sebagai warning.
 */
export async function invalidateProductCache(productId?: string): Promise<void> {
  try {
    const tasks: Promise<void>[] = [delCachePattern("products:list:*")];
    if (productId) {
      tasks.push(delCache(buildDetailCacheKey(productId)));
    }
    await Promise.all(tasks);
  } catch (error) {
    logger.warn({ error, productId }, "Failed to invalidate product cache — continuing");
  }
}
