import { productRepository } from "./product.repository";
import { type CreateProductInput, type UpdateProductInput, type ProductQueryInput } from "./product.schema";
import { AppError } from "@/lib/errors/AppError";
import { getCache, setCache, delCache, delCachePattern } from "@/lib/redis";

const PRODUCT_CACHE_TTL = 300; // 5 menit

/** Cache key builder untuk daftar produk (list) */
function buildListCacheKey(query: ProductQueryInput): string {
  return `products:list:page=${query.page}&limit=${query.limit}&search=${query.search ?? ""}`;
}

/** Cache key builder untuk detail produk berdasarkan ID */
function buildDetailCacheKey(id: string): string {
  return `products:detail:${id}`;
}

type ProductDTO = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ProductListCache = {
  products: ProductDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const productService = {
  /**
   * Ambil daftar produk aktif dengan pagination dan pencarian.
   * Cache-aside pattern: Redis → DB fallback. TTL 300s.
   */
  async getProducts(query: ProductQueryInput) {
    const cacheKey = buildListCacheKey(query);

    // 1. Cache hit → return langsung dari Redis
    const cached = await getCache<ProductListCache>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Cache miss → ambil dari database
    const [products, total] = await Promise.all([
      productRepository.findMany(query),
      productRepository.countMany(query.search),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    const formattedProducts = products.map((p) => ({
      ...p,
      price: p.price.toNumber(),
    }));

    const result: ProductListCache = {
      products: formattedProducts,
      pagination: { total, page: query.page, limit: query.limit, totalPages },
    };

    // 3. Simpan ke Redis
    await setCache(cacheKey, result, PRODUCT_CACHE_TTL);

    return result;
  },

  /**
   * Ambil detail 1 produk aktif berdasarkan ID.
   * Cache per-ID dengan TTL 300s.
   */
  async getProductById(id: string) {
    const cacheKey = buildDetailCacheKey(id);

    // 1. Cache hit
    const cached = await getCache<ProductDTO>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Cache miss → ambil dari DB
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const result: ProductDTO = {
      ...product,
      price: product.price.toNumber(),
    };

    // 3. Simpan ke Redis
    await setCache(cacheKey, result, PRODUCT_CACHE_TTL);

    return result;
  },

  /**
   * Buat produk baru.
   * Invalidasi semua cache list produk setelah create.
   */
  async createProduct(input: CreateProductInput) {
    const product = await productRepository.create(input);

    // Invalidasi seluruh list cache (semua kombinasi page/limit/search)
    await delCachePattern("products:list:*");

    return {
      ...product,
      price: product.price.toNumber(),
    };

    // Invalidate Redis list cache
    await invalidateProductCache();

    return result;
  },

  /**
   * Update produk.
   * Invalidasi list cache + detail cache produk yang diupdate.
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const updated = await productRepository.update(id, input);

    // Invalidasi list cache & detail cache spesifik produk ini
    await Promise.all([
      delCachePattern("products:list:*"),
      delCache(buildDetailCacheKey(id)),
    ]);

    return {
      ...updated,
      price: updated.price.toNumber(),
    };

    // Invalidate Redis detail & list cache
    await invalidateProductCache(id);

    return result;
  },

  /**
   * Soft delete produk (isDeleted = true & deletedAt = now).
   * Invalidasi list cache + detail cache produk yang dihapus.
   */
  async deleteProduct(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    await productRepository.softDelete(id);

    // Invalidasi list cache & detail cache spesifik produk ini
    await Promise.all([
      delCachePattern("products:list:*"),
      delCache(buildDetailCacheKey(id)),
    ]);

    return { id, isDeleted: true };
  },
};

