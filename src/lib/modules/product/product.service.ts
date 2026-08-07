import { productRepository } from "./product.repository";
import { type CreateProductInput, type UpdateProductInput, type ProductQueryInput } from "./product.schema";
import { AppError } from "@/lib/errors/AppError";

export const productService = {
  /**
   * Ambil daftar produk aktif dengan pagination dan pencarian.
   */
  async getProducts(query: ProductQueryInput) {
    const [products, total] = await Promise.all([
      productRepository.findMany(query),
      productRepository.countMany(query.search),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    // Format Decimal price ke number untuk response DTO yang lebih bersih
    const formattedProducts = products.map((p) => ({
      ...p,
      price: p.price.toNumber(),
    }));

    return {
      products: formattedProducts,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  },

  /**
   * Ambil detail 1 produk aktif berdasarkan ID.
   * Melempar AppError 404 jika produk tidak ditemukan / sudah di-soft-delete.
   */
  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return {
      ...product,
      price: product.price.toNumber(),
    };
  },

  /**
   * Buat produk baru.
   */
  async createProduct(input: CreateProductInput) {
    const product = await productRepository.create(input);
    return {
      ...product,
      price: product.price.toNumber(),
    };
  },

  /**
   * Update produk.
   * Memastikan produk ada sebelum diupdate.
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const updated = await productRepository.update(id, input);
    return {
      ...updated,
      price: updated.price.toNumber(),
    };
  },

  /**
   * Soft delete produk (isDeleted = true & deletedAt = now).
   * Memastikan produk ada sebelum dihapus.
   */
  async deleteProduct(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    await productRepository.softDelete(id);
    return { id, isDeleted: true };
  },
};
