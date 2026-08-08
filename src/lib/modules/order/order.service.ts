import { orderRepository } from "./order.repository";
import { type CreateOrderInput, type OrderQueryInput } from "./order.schema";
import { AppError } from "@/lib/errors/AppError";
import { delCachePattern, delCache } from "@/lib/redis";
import logger from "@/lib/logger";

/**
 * Helper untuk menghapus cache katalog produk setelah pemotongan stok transaksi order.
 */
async function invalidateProductCacheAfterOrder(productIds: string[]) {
  try {
    await delCachePattern("products:list:*");
    for (const id of productIds) {
      await delCache(`products:detail:${id}`);
    }
  } catch (error) {
    logger.warn({ error }, "Failed to invalidate product cache after order creation");
  }
}

/**
 * Helper untuk memformat Decimal Prisma ke number pada DTO Order.
 */
function formatOrderDto<T extends { totalPrice: { toNumber: () => number }; items: Array<{ unitPrice: { toNumber: () => number }; product?: { price: { toNumber: () => number } } }> }>(order: T) {
  return {
    ...order,
    totalPrice: order.totalPrice.toNumber(),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toNumber(),
      ...(item.product && {
        product: {
          ...item.product,
          price: item.product.price.toNumber(),
        },
      }),
    })),
  };
}

export const orderService = {
  /**
   * Membuat transaksi order baru.
   */
  async createOrder(userId: string, input: CreateOrderInput) {
    // 1. Eksekusi transaksi database
    const createdOrder = await orderRepository.createOrderInTransaction(
      userId,
      input.items,
      input.status
    );

    // 2. Invalidate cache Redis produk karena stok berubah
    const productIds = input.items.map((i) => i.productId);
    await invalidateProductCacheAfterOrder(productIds);

    // 3. Format DTO & return
    return formatOrderDto(createdOrder);
  },

  /**
   * Ambil detail order berdasarkan ID.
   * Melakukan verifikasi RBAC ownership: USER biasa hanya boleh melihat ordermya sendiri.
   */
  async getOrderById(orderId: string, currentUserId: string, currentUserRole: string) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // RBAC Ownership Check: USER biasa ditolak jika mencoba melihat order milik user lain
    if (currentUserRole === "USER" && order.userId !== currentUserId) {
      throw new AppError("Forbidden: You do not have permission.", 403);
    }

    return formatOrderDto(order);
  },

  /**
   * Ambil daftar order terpaginasi.
   * USER biasa HANYA dapat melihat ordermya sendiri. ADMIN dapat melihat seluruh order.
   */
  async getOrders(currentUserId: string, currentUserRole: string, query: OrderQueryInput) {
    // Tentukan penyaringan userId berdasarkan role
    const filterUserId = currentUserRole === "USER" ? currentUserId : undefined;

    const [orders, total] = await Promise.all([
      orderRepository.findOrders(filterUserId, query.page, query.limit),
      orderRepository.countOrders(filterUserId),
    ]);

    const totalPages = Math.ceil(total / query.limit);
    const formattedOrders = orders.map((order) => formatOrderDto(order));

    return {
      orders: formattedOrders,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  },
};
