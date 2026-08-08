/**
 * product.service.ts
 *
 * Business logic layer untuk modul Product.
 * Bertanggung jawab atas: orchestrasi repository, cache, dan validasi bisnis.
 */

import { productRepository } from "./product.repository";
import { type CreateProductInput, type UpdateProductInput, type ProductQueryInput } from "./product.schema";
import { type ProductDTO, type ProductListResult } from "./product.types";
import { CACHE_TTL, buildListCacheKey, buildDetailCacheKey, invalidateProductCache } from "./product.cache";
import { AppError } from "@/lib/errors/AppError";
import { getCache, setCache } from "@/lib/redis";
import logger from "@/lib/logger";

export const productService = {
  /**
   * Ambil daftar produk aktif dengan pagination dan pencarian.
   *
   * Strategi: Cache-Aside Pattern
   *   1. Cek Redis — jika HIT, return langsung (tidak query DB)
   *   2. Jika MISS, query DB, format hasilnya, lalu simpan ke Redis (TTL: 5 menit)
   */
  async getProducts(query: ProductQueryInput): Promise<ProductListResult> {
    const cacheKey = buildListCacheKey(query);

    const cached = await getCache<ProductListResult>(cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, "Cache HIT: getProducts");
      return cached;
    }

    logger.debug({ cacheKey }, "Cache MISS: getProducts");

    const [products, total] = await Promise.all([
      productRepository.findMany(query),
      productRepository.countMany(query.search),
    ]);

    const result: ProductListResult = {
      products: products.map((p) => ({ ...p, price: p.price.toNumber() })),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    await setCache(cacheKey, result, CACHE_TTL.LIST);

    return result;
  },

  /**
   * Ambil detail satu produk aktif berdasarkan ID.
   *
   * Strategi: Cache-Aside Pattern
   *   1. Cek Redis — jika HIT, return langsung
   *   2. Jika MISS, query DB, format, lalu simpan ke Redis (TTL: 10 menit)
   *   3. Jika produk tidak ditemukan, lempar AppError 404
   */
  async getProductById(id: string): Promise<ProductDTO> {
    const cacheKey = buildDetailCacheKey(id);

    const cached = await getCache<ProductDTO>(cacheKey);
    if (cached) {
      logger.debug({ id }, "Cache HIT: getProductById");
      return cached;
    }

    logger.debug({ id }, "Cache MISS: getProductById");

    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const result: ProductDTO = { ...product, price: product.price.toNumber() };

    await setCache(cacheKey, result, CACHE_TTL.DETAIL);

    return result;
  },

  /**
   * Buat produk baru, lalu invalidasi semua list cache.
   */
  async createProduct(input: CreateProductInput): Promise<ProductDTO> {
    const product = await productRepository.create(input);
    const result: ProductDTO = { ...product, price: product.price.toNumber() };

    await invalidateProductCache();

    return result;
  },

  /**
   * Update produk berdasarkan ID.
   * Invalidasi list cache + detail cache produk yang diubah.
   */
  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductDTO> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const updated = await productRepository.update(id, input);
    const result: ProductDTO = { ...updated, price: updated.price.toNumber() };

    await invalidateProductCache(id);

    return result;
  },

  /**
   * Soft delete produk (set isDeleted = true, deletedAt = now).
   * Invalidasi list cache + detail cache produk yang dihapus.
   */
  async deleteProduct(id: string): Promise<{ id: string; isDeleted: true }> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    await productRepository.softDelete(id);

    await invalidateProductCache(id);

    return { id, isDeleted: true };
  },
};
