import { productRepository } from "./product.repository";
import { type CreateProductInput, type UpdateProductInput, type ProductQueryInput } from "./product.schema";
import { AppError } from "@/lib/errors/AppError";
import { getCache, setCache, delCache, delCachePattern } from "@/lib/redis";
import logger from "@/lib/logger";

const CACHE_TTL = {
  LIST: 300, // 5 menit
  DETAIL: 600, // 10 menit
};

/**
 * Helper untuk menghapus cache list & detail produk saat ada perubahan data (mutasi).
 */
async function invalidateProductCache(productId?: string) {
  try {
    await delCachePattern("products:list:*");
    if (productId) {
      await delCache(`products:detail:${productId}`);
    }
  } catch (error) {
    logger.warn({ error, productId }, "Failed to invalidate product cache");
  }
}

export const productService = {
  /**
   * Ambil daftar produk aktif dengan pagination dan pencarian.
   * Menggunakan Redis Cache (Key: products:list:page:X:limit:Y:search:Z).
   */
  async getProducts(query: ProductQueryInput) {
    const cacheKey = `products:list:page:${query.page}:limit:${query.limit}:search:${query.search || ""}`;

    // 1. Cek Redis Cache
    const cachedData = await getCache<ReturnType<typeof formatProductsResult>>(cacheKey);
    if (cachedData) {
      logger.debug({ cacheKey }, "Redis Cache HIT: getProducts");
      return cachedData;
    }

    logger.debug({ cacheKey }, "Redis Cache MISS: getProducts");

    // 2. Query ke Database jika Cache MISS
    const [products, total] = await Promise.all([
      productRepository.findMany(query),
      productRepository.countMany(query.search),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    // Format Decimal price ke number untuk response DTO
    const formattedProducts = products.map((p) => ({
      ...p,
      price: p.price.toNumber(),
    }));

    const result = {
      products: formattedProducts,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };

    // 3. Simpan ke Redis Cache (TTL 5 menit)
    await setCache(cacheKey, result, CACHE_TTL.LIST);

    return result;
  },

  /**
   * Ambil detail 1 produk aktif berdasarkan ID.
   * Menggunakan Redis Cache (Key: products:detail:ID).
   */
  async getProductById(id: string) {
    const cacheKey = `products:detail:${id}`;

    // 1. Cek Redis Cache
    const cachedData = await getCache<Record<string, unknown>>(cacheKey);
    if (cachedData) {
      logger.debug({ id }, "Redis Cache HIT: getProductById");
      return cachedData;
    }

    logger.debug({ id }, "Redis Cache MISS: getProductById");

    // 2. Query ke Database
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const formattedProduct = {
      ...product,
      price: product.price.toNumber(),
    };

    // 3. Simpan ke Redis Cache (TTL 10 menit)
    await setCache(cacheKey, formattedProduct, CACHE_TTL.DETAIL);

    return formattedProduct;
  },

  /**
   * Buat produk baru.
   * Melakukan cache invalidation untuk list produk (`products:list:*`).
   */
  async createProduct(input: CreateProductInput) {
    const product = await productRepository.create(input);
    const result = {
      ...product,
      price: product.price.toNumber(),
    };

    // Invalidate Redis list cache
    await invalidateProductCache();

    return result;
  },

  /**
   * Update produk.
   * Melakukan cache invalidation untuk detail & list produk.
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const updated = await productRepository.update(id, input);
    const result = {
      ...updated,
      price: updated.price.toNumber(),
    };

    // Invalidate Redis detail & list cache
    await invalidateProductCache(id);

    return result;
  },

  /**
   * Soft delete produk (isDeleted = true & deletedAt = now).
   * Melakukan cache invalidation untuk detail & list produk.
   */
  async deleteProduct(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    await productRepository.softDelete(id);

    // Invalidate Redis detail & list cache
    await invalidateProductCache(id);

    return { id, isDeleted: true };
  },
};

// Helper type untuk typescript inference internal
function formatProductsResult() {
  return {
    products: [] as Array<Record<string, unknown>>,
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
  };
}
