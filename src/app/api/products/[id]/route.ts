import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { decryptRequest, encryptResponse } from "@/lib/crypto/middleware";
import { apiError } from "@/lib/response/api";
import { updateProductSchema } from "@/lib/modules/product/product.schema";
import { productService } from "@/lib/modules/product/product.service";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]
 *
 * Mendapatkan detail produk berdasarkan ID.
 * Akses: Authenticated Users (ADMIN & USER).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verifikasi Autentikasi (ADMIN & USER)
    const authResult = await withAuth(request, ["ADMIN", "USER"]);
    if (!authResult.success) return authResult.response;

    const { id } = await params;

    // 2. Panggil service
    const product = await productService.getProductById(id);

    // 3. Return response
    return encryptResponse(
      {
        success: true,
        message: "Product retrieved successfully",
        data: product,
      },
      null,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in GET /api/products/[id]");
    return apiError("Internal server error", 500);
  }
}

/**
 * PUT /api/products/[id]
 *
 * Memperbarui data produk.
 * Akses: ADMIN ONLY (USER ditolak 403 Forbidden).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verifikasi Autentikasi & Otorisasi Role (HANYA ADMIN)
    const authResult = await withAuth(request, ["ADMIN"]);
    if (!authResult.success) return authResult.response;

    const { id } = await params;

    // 2. Decrypt body (jika enkripsi aktif) atau parse JSON
    const { body, clientPublicKey } = await decryptRequest(request);

    // 3. Validasi Zod schema
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    // 4. Panggil service
    const updated = await productService.updateProduct(id, parsed.data);

    logger.info({ productId: id, adminId: authResult.user.userId }, "Product updated successfully");

    // 5. Return response
    return encryptResponse(
      {
        success: true,
        message: "Product updated successfully",
        data: updated,
      },
      clientPublicKey,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in PUT /api/products/[id]");
    return apiError("Internal server error", 500);
  }
}

/**
 * DELETE /api/products/[id]
 *
 * Soft delete produk (isDeleted = true, deletedAt = now).
 * Akses: ADMIN ONLY (USER ditolak 403 Forbidden).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verifikasi Autentikasi & Otorisasi Role (HANYA ADMIN)
    const authResult = await withAuth(request, ["ADMIN"]);
    if (!authResult.success) return authResult.response;

    const { id } = await params;

    // 2. Panggil service
    await productService.deleteProduct(id);

    logger.info({ productId: id, adminId: authResult.user.userId }, "Product soft deleted successfully");

    // 3. Return response
    return encryptResponse(
      {
        success: true,
        message: "Product deleted successfully",
      },
      null,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in DELETE /api/products/[id]");
    return apiError("Internal server error", 500);
  }
}
