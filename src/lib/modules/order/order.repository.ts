import { prisma } from "@/lib/db/prisma";
import { type CreateOrderItemInput } from "./order.schema";
import { AppError } from "@/lib/errors/AppError";
import { Prisma, OrderStatus } from "@/generated/prisma";

export const orderRepository = {
  /**
   * Membuat order baru dalam 1 Database Transaction (`prisma.$transaction`).
   *
   * Alur Atomik:
   * 1. Validasi keberadaan & keaktifan produk.
   * 2. Pengecekan kecukupan stok produk.
   * 3. Kalkulasi total harga & snapshot unitPrice per item.
   * 4. Pemotongan stok produk (`stock: { decrement: quantity }`).
   * 5. Penulisan record `Order` dan `OrderItem`.
   *
   * Jika salah satu poin di atas gagal, seluruh transaksi di-rollback secara otomatis.
   */
  async createOrderInTransaction(
    userId: string,
    items: CreateOrderItemInput[],
    status: OrderStatus = "CONFIRMED"
  ) {
    return await prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.productId);

      // 1. Ambil produk aktif dari database
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isDeleted: false,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let calculatedTotal = new Prisma.Decimal(0);
      const orderItemsToCreate: Array<{
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }> = [];

      // 2. Validasi stok & kalkulasi total harga
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new AppError(
            `Product with ID '${item.productId}' not found or unavailable`,
            400
          );
        }

        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product '${product.name}' (Available: ${product.stock}, Requested: ${item.quantity})`,
            400
          );
        }

        const itemSubtotal = product.price.mul(item.quantity);
        calculatedTotal = calculatedTotal.add(itemSubtotal);

        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price, // Snapshot harga saat transaksi
        });

        // 3. Pemotongan stok secara atomik di dalam transaksi
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 4. Buat record Order beserta OrderItems
      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalPrice: calculatedTotal,
          status,
          items: {
            createMany: {
              data: orderItemsToCreate,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return createdOrder;
    });
  },

  /**
   * Cari order berdasarkan ID (lengkap dengan items, detail produk, dan pemesan).
   */
  async findOrderById(orderId: string) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  },

  /**
   * Ambil daftar order terpaginasi (opsional filter `userId` untuk role USER).
   */
  async findOrders(userId: string | undefined, page: number, limit: number) {
    const whereCondition = userId ? { userId } : {};

    return await prisma.order.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  },

  /**
   * Hitung total order untuk metadata pagination.
   */
  async countOrders(userId?: string) {
    const whereCondition = userId ? { userId } : {};
    return await prisma.order.count({
      where: whereCondition,
    });
  },
};
