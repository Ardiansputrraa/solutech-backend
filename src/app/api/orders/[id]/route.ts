import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { encryptResponse } from "@/lib/crypto/middleware";
import { apiError } from "@/lib/response/api";
import { orderService } from "@/lib/modules/order/order.service";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 *
 * Mengambil detail transaksi order berdasarkan ID.
 * Akses: Authenticated Users (ADMIN & USER dengan verifikasi kepemilikan).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verifikasi Autentikasi (ADMIN & USER diizinkan)
    const authResult = await withAuth(request, ["ADMIN", "USER"]);
    if (!authResult.success) return authResult.response;

    const { id } = await params;

    // 2. Panggil service layer (memeriksa keberadaan order & RBAC ownership)
    const order = await orderService.getOrderById(
      id,
      authResult.user.userId,
      authResult.user.role
    );

    // 3. Return response
    return encryptResponse(
      {
        success: true,
        statusCode: 200,
        message: "Order retrieved successfully",
        data: order,
      },
      null,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in GET /api/orders/[id]");
    return apiError("Internal server error", 500);
  }
}
