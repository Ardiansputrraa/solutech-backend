import { productService } from "@/lib/modules/product/product.service";
import { productRepository } from "@/lib/modules/product/product.repository";
import { AppError } from "@/lib/errors/AppError";
import { Prisma } from "@/generated/prisma";
import * as redisModule from "@/lib/redis";

jest.mock("@/lib/modules/product/product.repository");
jest.mock("@/lib/redis");

const mockProductRepository = productRepository as jest.Mocked<typeof productRepository>;
const mockRedis = redisModule as jest.Mocked<typeof redisModule>;

describe("productService", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockRedis.getCache.mockResolvedValue(null);
  });

  const sampleDbProduct = {
    id: "prod-1",
    name: "Laptop ThinkPad X1",
    price: new Prisma.Decimal(22000000),
    stock: 10,
    description: "High performance laptop",
    isDeleted: false,
    createdAt: new Date("2026-08-07T00:00:00Z"),
    updatedAt: new Date("2026-08-07T00:00:00Z"),
    deletedAt: null,
  };

  describe("getProducts", () => {
    it("should return cached data if Redis Cache HIT occurs", async () => {
      const cachedResponse = {
        products: [
          {
            id: "prod-cached",
            name: "Cached Product",
            price: 500000,
            stock: 5,
            description: "From Redis",
            isDeleted: false,
            createdAt: "2026-08-07T00:00:00.000Z",
            updatedAt: "2026-08-07T00:00:00.000Z",
            deletedAt: null,
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockRedis.getCache.mockResolvedValue(cachedResponse);

      const result = await productService.getProducts({ page: 1, limit: 10, search: undefined });

      expect(result).toEqual(cachedResponse);
      expect(mockProductRepository.findMany).not.toHaveBeenCalled();
    });

    it("should return formatted products from DB and set cache on Redis Cache MISS", async () => {
      mockRedis.getCache.mockResolvedValue(null);
      mockProductRepository.findMany.mockResolvedValue([sampleDbProduct]);
      mockProductRepository.countMany.mockResolvedValue(1);

      const result = await productService.getProducts({ page: 1, limit: 10, search: undefined });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(22000000);
      expect(result.products[0].isDeleted).toBe(false);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockProductRepository.findMany).toHaveBeenCalledWith({ page: 1, limit: 10, search: undefined });
      expect(mockRedis.setCache).toHaveBeenCalledWith(
        "products:list:page:1:limit:10:search:",
        expect.any(Object),
        300
      );
    });
  });

  describe("getProductById", () => {
    it("should return product detail from DB and set cache on Redis Cache MISS", async () => {
      mockRedis.getCache.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(sampleDbProduct);

      const result = await productService.getProductById("prod-1");

      expect(result.id).toBe("prod-1");
      expect(result.name).toBe("Laptop ThinkPad X1");
      expect(result.price).toBe(22000000);
      expect(result.isDeleted).toBe(false);
      expect(mockRedis.setCache).toHaveBeenCalledWith("products:detail:prod-1", expect.any(Object), 600);
    });

    it("should throw AppError(404) when product is not found or soft deleted", async () => {
      mockRedis.getCache.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.getProductById("non-existent")).rejects.toThrow(
        new AppError("Product not found", 404)
      );
    });
  });

  describe("createProduct", () => {
    it("should create product successfully and invalidate list cache", async () => {
      const input = {
        name: "Smartwatch Pro",
        price: 1850000,
        stock: 25,
        description: "Fitness smartwatch",
      };

      const createdDbProduct = {
        ...sampleDbProduct,
        id: "prod-2",
        name: input.name,
        price: new Prisma.Decimal(input.price),
        stock: input.stock,
        description: input.description,
      };

      mockProductRepository.create.mockResolvedValue(createdDbProduct);

      const result = await productService.createProduct(input);

      expect(result.id).toBe("prod-2");
      expect(result.name).toBe("Smartwatch Pro");
      expect(result.price).toBe(1850000);
      expect(mockProductRepository.create).toHaveBeenCalledWith(input);
      expect(mockRedis.delCachePattern).toHaveBeenCalledWith("products:list:*");
    });
  });

  describe("updateProduct", () => {
    it("should update product successfully and invalidate detail & list cache", async () => {
      mockProductRepository.findById.mockResolvedValue(sampleDbProduct);

      const updatedDbProduct = {
        ...sampleDbProduct,
        price: new Prisma.Decimal(20000000),
        stock: 15,
      };

      mockProductRepository.update.mockResolvedValue(updatedDbProduct);

      const result = await productService.updateProduct("prod-1", { price: 20000000, stock: 15 });

      expect(result.price).toBe(20000000);
      expect(result.stock).toBe(15);
      expect(mockProductRepository.update).toHaveBeenCalledWith("prod-1", { price: 20000000, stock: 15 });
      expect(mockRedis.delCachePattern).toHaveBeenCalledWith("products:list:*");
      expect(mockRedis.delCache).toHaveBeenCalledWith("products:detail:prod-1");
    });

    it("should throw AppError(404) when product to update is not found", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.updateProduct("non-existent", { stock: 5 })).rejects.toThrow(
        new AppError("Product not found", 404)
      );
    });
  });

  describe("deleteProduct", () => {
    it("should soft delete product and invalidate detail & list cache", async () => {
      mockProductRepository.findById.mockResolvedValue(sampleDbProduct);

      const softDeletedDbProduct = {
        ...sampleDbProduct,
        isDeleted: true,
        deletedAt: new Date("2026-08-07T12:00:00Z"),
      };

      mockProductRepository.softDelete.mockResolvedValue(softDeletedDbProduct);

      const result = await productService.deleteProduct("prod-1");

      expect(result.id).toBe("prod-1");
      expect(result.isDeleted).toBe(true);
      expect(mockProductRepository.softDelete).toHaveBeenCalledWith("prod-1");
      expect(mockRedis.delCachePattern).toHaveBeenCalledWith("products:list:*");
      expect(mockRedis.delCache).toHaveBeenCalledWith("products:detail:prod-1");
    });

    it("should throw AppError(404) when product to delete is not found", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.deleteProduct("non-existent")).rejects.toThrow(
        new AppError("Product not found", 404)
      );
    });
  });
});
