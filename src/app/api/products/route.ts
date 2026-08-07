import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { decryptRequest, encryptResponse } from "@/lib/crypto/middleware";
import { apiError } from "@/lib/response/api";
import { createProductSchema, productQuerySchema } from "@/lib/modules/product/product.schema";
import { productService } from "@/lib/modules/product/product.service";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

/**
 * GET /api/products
 *
 * Mendapatkan daftar produk aktif (dengan pagination dan pencarian).
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
      search: url.searchParams.get("search") ?? undefined,
    };

    const parsedQuery = productQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return apiError("Invalid query parameters", 400, parsedQuery.error.flatten());
    }

    // 3. Panggil service
    const result = await productService.getProducts(parsedQuery.data);

    // 4. Return response
    return encryptResponse(
      {
        success: true,
        message: "Products retrieved successfully",
        data: result.products,
        pagination: result.pagination,
      },
      null,
      200
    );
  } catch (error) {
    console.error("GET /api/products error:", error);
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in GET /api/products");
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/products
 *
 * Membuat produk baru.
 * Akses: ADMIN ONLY (USER ditolak 403 Forbidden).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verifikasi Autentikasi & Otorisasi Role (HANYA ADMIN)
    const authResult = await withAuth(request, ["ADMIN"]);
    if (!authResult.success) return authResult.response;

    // 2. Decrypt body (jika enkripsi aktif) atau parse JSON
    const { body, clientPublicKey } = await decryptRequest(request);

    // 3. Validasi Zod schema
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    // 4. Panggil service
    const product = await productService.createProduct(parsed.data);

    logger.info({ productId: product.id, adminId: authResult.user.userId }, "Product created successfully");

    // 5. Return response (201 Created)
    return encryptResponse(
      {
        success: true,
        message: "Product created successfully",
        data: product,
      },
      clientPublicKey,
      201
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in POST /api/products");
    return apiError("Internal server error", 500);
  }
}
