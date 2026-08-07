import { prisma } from "@/lib/db/prisma";
import { type CreateProductInput, type UpdateProductInput, type ProductQueryInput } from "./product.schema";
import { Prisma } from "@/generated/prisma";

export const productRepository = {
  /**
   * Ambil daftar produk aktif (isDeleted: false & deletedAt: null) dengan pagination dan pencarian.
   */
  async findMany(query: ProductQueryInput) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      deletedAt: null,
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    };

    return prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Hitung total produk aktif untuk metadata pagination.
   */
  async countMany(search?: string) {
    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      deletedAt: null,
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    };

    return prisma.product.count({ where });
  },

  /**
   * Cari 1 produk aktif berdasarkan ID.
   */
  async findById(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        deletedAt: null,
      },
    });
  },

  /**
   * Tambah produk baru ke database.
   */
  async create(data: CreateProductInput) {
    return prisma.product.create({
      data: {
        name: data.name,
        price: new Prisma.Decimal(data.price),
        stock: data.stock,
        description: data.description,
      },
    });
  },

  /**
   * Update data produk berdasarkan ID.
   */
  async update(id: string, data: UpdateProductInput) {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  },

  /**
   * Soft delete produk berdasarkan ID (set isDeleted = true & deletedAt = new Date()).
   */
  async softDelete(id: string) {
    return prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  },
};
