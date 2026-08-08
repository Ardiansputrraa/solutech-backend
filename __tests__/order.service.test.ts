import { orderService } from "@/lib/modules/order/order.service";
import { orderRepository } from "@/lib/modules/order/order.repository";
import { AppError } from "@/lib/errors/AppError";
import { Prisma } from "@/generated/prisma";
import * as redisModule from "@/lib/redis";

jest.mock("@/lib/modules/order/order.repository");
jest.mock("@/lib/redis");

const mockOrderRepository = orderRepository as jest.Mocked<typeof orderRepository>;
const mockRedis = redisModule as jest.Mocked<typeof redisModule>;

describe("orderService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const sampleDbOrder = {
    id: "order-123",
    userId: "user-1",
    totalPrice: new Prisma.Decimal(2500000),
    status: "CONFIRMED" as const,
    createdAt: new Date("2026-08-08T00:00:00Z"),
    updatedAt: new Date("2026-08-08T00:00:00Z"),
    user: {
      id: "user-1",
      email: "user@solutech.id",
      name: "User Demo",
    },
    items: [
      {
        id: "item-1",
        orderId: "order-123",
        productId: "prod-1",
        quantity: 2,
        unitPrice: new Prisma.Decimal(1250000),
        product: {
          id: "prod-1",
          name: "Keyboard RGB",
          price: new Prisma.Decimal(1250000),
          stock: 10,
          description: "Mechanical keyboard",
          isDeleted: false,
          createdAt: new Date("2026-08-08T00:00:00Z"),
          updatedAt: new Date("2026-08-08T00:00:00Z"),
          deletedAt: null,
        },
      },
    ],
  };

  describe("createOrder", () => {
    it("should successfully create order in transaction and invalidate redis product cache", async () => {
      mockOrderRepository.createOrderInTransaction.mockResolvedValue(sampleDbOrder);

      const input = {
        status: "CONFIRMED" as const,
        items: [{ productId: "prod-1", quantity: 2 }],
      };

      const result = await orderService.createOrder("user-1", input);

      expect(result.id).toBe("order-123");
      expect(result.totalPrice).toBe(2500000);
      expect(result.items[0].unitPrice).toBe(1250000);
      expect(mockOrderRepository.createOrderInTransaction).toHaveBeenCalledWith("user-1", input.items, "CONFIRMED");
      expect(mockRedis.delCachePattern).toHaveBeenCalledWith("products:list:*");
      expect(mockRedis.delCache).toHaveBeenCalledWith("products:detail:prod-1");
    });
  });

  describe("getOrderById", () => {
    it("should return order detail when user accesses their own order", async () => {
      mockOrderRepository.findOrderById.mockResolvedValue(sampleDbOrder);

      const result = await orderService.getOrderById("order-123", "user-1", "USER");

      expect(result.id).toBe("order-123");
      expect(result.totalPrice).toBe(2500000);
      expect(result.user.id).toBe("user-1");
    });

    it("should allow ADMIN to access any user order", async () => {
      mockOrderRepository.findOrderById.mockResolvedValue(sampleDbOrder);

      const result = await orderService.getOrderById("order-123", "admin-999", "ADMIN");

      expect(result.id).toBe("order-123");
      expect(result.totalPrice).toBe(2500000);
    });

    it("should throw AppError(403) when USER tries to access another user's order", async () => {
      mockOrderRepository.findOrderById.mockResolvedValue(sampleDbOrder);

      await expect(
        orderService.getOrderById("order-123", "other-user-999", "USER")
      ).rejects.toThrow(new AppError("Forbidden: You do not have permission.", 403));
    });

    it("should throw AppError(404) when order does not exist", async () => {
      mockOrderRepository.findOrderById.mockResolvedValue(null);

      await expect(
        orderService.getOrderById("non-existent", "user-1", "USER")
      ).rejects.toThrow(new AppError("Order not found", 404));
    });
  });

  describe("getOrders", () => {
    it("should filter orders by userId when role is USER", async () => {
      mockOrderRepository.findOrders.mockResolvedValue([sampleDbOrder]);
      mockOrderRepository.countOrders.mockResolvedValue(1);

      const result = await orderService.getOrders("user-1", "USER", { page: 1, limit: 10 });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].totalPrice).toBe(2500000);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockOrderRepository.findOrders).toHaveBeenCalledWith("user-1", 1, 10);
      expect(mockOrderRepository.countOrders).toHaveBeenCalledWith("user-1");
    });

    it("should return all orders without userId filter when role is ADMIN", async () => {
      mockOrderRepository.findOrders.mockResolvedValue([sampleDbOrder]);
      mockOrderRepository.countOrders.mockResolvedValue(1);

      const result = await orderService.getOrders("admin-999", "ADMIN", { page: 1, limit: 10 });

      expect(result.orders).toHaveLength(1);
      expect(mockOrderRepository.findOrders).toHaveBeenCalledWith(undefined, 1, 10);
      expect(mockOrderRepository.countOrders).toHaveBeenCalledWith(undefined);
    });
  });
});
