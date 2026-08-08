import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { decryptRequest, encryptResponse } from "@/lib/crypto/middleware";
import { apiError } from "@/lib/response/api";
import { createOrderSchema, orderQuerySchema } from "@/lib/modules/order/order.schema";
import { orderService } from "@/lib/modules/order/order.service";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

/**
 * POST /api/orders
 *
 * Membuat transaksi order baru (multi-item transaction).
 * Akses: Authenticated Users (ADMIN & USER).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verifikasi Autentikasi (ADMIN & USER diizinkan)
    const authResult = await withAuth(request, ["ADMIN", "USER"]);
    if (!authResult.success) return authResult.response;

    // 2. Decrypt body (jika mode terenkripsi) atau parse JSON biasa
    const { body, clientPublicKey } = await decryptRequest(request);

    // 3. Validasi Zod schema
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    // 4. Panggil service layer untuk pembuatan order dalam DB Transaction
    const order = await orderService.createOrder(authResult.user.userId, parsed.data);

    logger.info(
      { orderId: order.id, userId: authResult.user.userId, totalAmount: order.totalPrice },
      "Order created successfully"
    );

    // 5. Return response (201 Created)
    return encryptResponse(
      {
        success: true,
        statusCode: 201,
        message: "Order created successfully",
        data: order,
      },
      clientPublicKey,
      201
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in POST /api/orders");
    return apiError("Internal server error", 500);
  }
}

/**
 * GET /api/orders
 *
 * Mengambil daftar order terpaginasi.
 * USER biasa HANYA melihat ordermya sendiri. ADMIN dapat melihat seluruh order.
 * Akses: Authenticated Users (ADMIN & USER).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verifikasi Autentikasi (ADMIN & USER diizinkan)
    const authResult = await withAuth(request, ["ADMIN", "USER"]);
    if (!authResult.success) return authResult.response;

    // 2. Parse query parameters
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const parsedQuery = orderQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return apiError("Invalid query parameters", 400, parsedQuery.error.flatten());
    }

    // 3. Panggil service layer
    const result = await orderService.getOrders(
      authResult.user.userId,
      authResult.user.role,
      parsedQuery.data
    );

    // 4. Return response
    return encryptResponse(
      {
        success: true,
        statusCode: 200,
        message: "Orders retrieved successfully",
        data: result.orders,
        pagination: result.pagination,
      },
      null,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in GET /api/orders");
    return apiError("Internal server error", 500);
  }
}
