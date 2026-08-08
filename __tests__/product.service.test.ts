import { productService } from "@/lib/modules/product/product.service";
import { productRepository } from "@/lib/modules/product/product.repository";
import { AppError } from "@/lib/errors/AppError";
import { Prisma } from "@/generated/prisma";
import * as redisModule from "@/lib/redis";
import * as productCache from "@/lib/modules/product/product.cache";

jest.mock("@/lib/modules/product/product.repository");
jest.mock("@/lib/redis");
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock product.cache — kita test bahwa service memanggil invalidateProductCache dengan benar
jest.mock("@/lib/modules/product/product.cache", () => ({
  ...jest.requireActual("@/lib/modules/product/product.cache"),
  invalidateProductCache: jest.fn().mockResolvedValue(undefined),
}));

const mockRepo = productRepository as jest.Mocked<typeof productRepository>;
const mockRedis = redisModule as jest.Mocked<typeof redisModule>;
const mockCache = productCache as jest.Mocked<typeof productCache>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleDbProduct = {
  id: "prod-1",
  name: "Laptop ThinkPad X1",
  price: new Prisma.Decimal(22000000),
  stock: 10,
  description: "High performance laptop",
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2026-08-07T00:00:00Z"),
  updatedAt: new Date("2026-08-07T00:00:00Z"),
};

const sampleProductDTO = {
  ...sampleDbProduct,
  price: 22000000,
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("productService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cache selalu MISS kecuali dioverride dalam test spesifik
    mockRedis.getCache.mockResolvedValue(null);
    mockRedis.setCache.mockResolvedValue(undefined);
    mockRedis.delCache.mockResolvedValue(undefined);
    mockRedis.delCachePattern.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // getProducts
  // -------------------------------------------------------------------------

  describe("getProducts", () => {
    const query = { page: 1, limit: 10, search: undefined };
    const expectedCacheKey = "products:list:page:1:limit:10:search:";

    it("should return cached data immediately on Cache HIT (no DB query)", async () => {
      const cachedResult = {
        products: [{ ...sampleProductDTO }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockRedis.getCache.mockResolvedValue(cachedResult);

      const result = await productService.getProducts(query);

      expect(result).toEqual(cachedResult);
      expect(mockRedis.getCache).toHaveBeenCalledWith(expectedCacheKey);
      expect(mockRepo.findMany).not.toHaveBeenCalled();
      expect(mockRepo.countMany).not.toHaveBeenCalled();
      expect(mockRedis.setCache).not.toHaveBeenCalled();
    });

    it("should query DB, format result, and set cache on Cache MISS", async () => {
      mockRepo.findMany.mockResolvedValue([sampleDbProduct]);
      mockRepo.countMany.mockResolvedValue(1);

      const result = await productService.getProducts(query);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(22000000); // Decimal → number
      expect(result.products[0].isDeleted).toBe(false);
      expect(result.pagination).toEqual({
        total: 1, page: 1, limit: 10, totalPages: 1,
      });

      expect(mockRepo.findMany).toHaveBeenCalledWith(query);
      expect(mockRepo.countMany).toHaveBeenCalledWith(undefined);
      expect(mockRedis.setCache).toHaveBeenCalledWith(
        expectedCacheKey,
        expect.objectContaining({ products: expect.any(Array) }),
        300 // CACHE_TTL.LIST
      );
    });

    it("should include search term in cache key when search is provided", async () => {
      const queryWithSearch = { page: 1, limit: 10, search: "laptop" };
      mockRepo.findMany.mockResolvedValue([sampleDbProduct]);
      mockRepo.countMany.mockResolvedValue(1);

      await productService.getProducts(queryWithSearch);

      expect(mockRedis.setCache).toHaveBeenCalledWith(
        "products:list:page:1:limit:10:search:laptop",
        expect.any(Object),
        300
      );
    });
  });

  // -------------------------------------------------------------------------
  // getProductById
  // -------------------------------------------------------------------------

  describe("getProductById", () => {
    const expectedCacheKey = "products:detail:prod-1";

    it("should return cached product immediately on Cache HIT (no DB query)", async () => {
      mockRedis.getCache.mockResolvedValue(sampleProductDTO);

      const result = await productService.getProductById("prod-1");

      expect(result).toEqual(sampleProductDTO);
      expect(mockRedis.getCache).toHaveBeenCalledWith(expectedCacheKey);
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRedis.setCache).not.toHaveBeenCalled();
    });

    it("should query DB, format, and set cache on Cache MISS", async () => {
      mockRepo.findById.mockResolvedValue(sampleDbProduct);

      const result = await productService.getProductById("prod-1");

      expect(result.id).toBe("prod-1");
      expect(result.name).toBe("Laptop ThinkPad X1");
      expect(result.price).toBe(22000000); // Decimal → number
      expect(result.isDeleted).toBe(false);

      expect(mockRepo.findById).toHaveBeenCalledWith("prod-1");
      expect(mockRedis.setCache).toHaveBeenCalledWith(
        expectedCacheKey,
        expect.objectContaining({ id: "prod-1" }),
        600 // CACHE_TTL.DETAIL
      );
    });

    it("should throw AppError(404) when product is not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(productService.getProductById("non-existent")).rejects.toThrow(
        new AppError("Product not found", 404)
      );
      expect(mockRedis.setCache).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // createProduct
  // -------------------------------------------------------------------------

  describe("createProduct", () => {
    it("should create product, return formatted DTO, and invalidate list cache", async () => {
      const input = { name: "Smartwatch Pro", price: 1850000, stock: 25, description: "Fitness watch" };
      const createdDbProduct = {
        ...sampleDbProduct,
        id: "prod-new",
        name: input.name,
        price: new Prisma.Decimal(input.price),
        stock: input.stock,
        description: input.description,
      };

      mockRepo.create.mockResolvedValue(createdDbProduct);

      const result = await productService.createProduct(input);

      expect(result.id).toBe("prod-new");
      expect(result.name).toBe("Smartwatch Pro");
      expect(result.price).toBe(1850000);
      expect(mockRepo.create).toHaveBeenCalledWith(input);
      // invalidateProductCache dipanggil tanpa productId (hanya invalidasi list cache)
      expect(mockCache.invalidateProductCache).toHaveBeenCalledWith();
    });
  });

  // -------------------------------------------------------------------------
  // updateProduct
  // -------------------------------------------------------------------------

  describe("updateProduct", () => {
    it("should update product, return formatted DTO, and invalidate list + detail cache", async () => {
      const updatedDbProduct = {
        ...sampleDbProduct,
        price: new Prisma.Decimal(20000000),
        stock: 15,
      };

      mockRepo.findById.mockResolvedValue(sampleDbProduct);
      mockRepo.update.mockResolvedValue(updatedDbProduct);

      const result = await productService.updateProduct("prod-1", { price: 20000000, stock: 15 });

      expect(result.price).toBe(20000000);
      expect(result.stock).toBe(15);
      expect(mockRepo.update).toHaveBeenCalledWith("prod-1", { price: 20000000, stock: 15 });
      // invalidateProductCache dipanggil dengan productId untuk invalidasi list + detail
      expect(mockCache.invalidateProductCache).toHaveBeenCalledWith("prod-1");
    });

    it("should throw AppError(404) when product to update is not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        productService.updateProduct("non-existent", { stock: 5 })
      ).rejects.toThrow(new AppError("Product not found", 404));

      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockCache.invalidateProductCache).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteProduct
  // -------------------------------------------------------------------------

  describe("deleteProduct", () => {
    it("should soft delete product and invalidate list + detail cache", async () => {
      mockRepo.findById.mockResolvedValue(sampleDbProduct);
      mockRepo.softDelete.mockResolvedValue({ ...sampleDbProduct, isDeleted: true, deletedAt: new Date() });

      const result = await productService.deleteProduct("prod-1");

      expect(result).toEqual({ id: "prod-1", isDeleted: true });
      expect(mockRepo.softDelete).toHaveBeenCalledWith("prod-1");
      // invalidateProductCache dipanggil dengan productId untuk invalidasi list + detail
      expect(mockCache.invalidateProductCache).toHaveBeenCalledWith("prod-1");
    });

    it("should throw AppError(404) when product to delete is not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(productService.deleteProduct("non-existent")).rejects.toThrow(
        new AppError("Product not found", 404)
      );

      expect(mockRepo.softDelete).not.toHaveBeenCalled();
      expect(mockCache.invalidateProductCache).not.toHaveBeenCalled();
    });
  });
});
