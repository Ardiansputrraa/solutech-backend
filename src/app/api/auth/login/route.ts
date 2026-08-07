import { type NextRequest } from "next/server";
import { apiError } from "@/lib/response/api";
import { decryptRequest, encryptResponse } from "@/lib/crypto/middleware";
import { loginSchema } from "@/lib/modules/auth/auth.schema";
import { authService } from "@/lib/modules/auth/auth.service";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

/**
 * POST /api/auth/login
 *
 * Endpoint autentikasi user (Login).
 *
 * Mendukung 2 mode (otomatis disesuaikan oleh decryptRequest & encryptResponse):
 * - Local (ENCRYPTION_ENABLED=false): Terima JSON biasa & Return JSON biasa.
 * - Dev/UAT/Prod (ENCRYPTION_ENABLED=true): Terima payload terenkripsi (RSA+AES) & Return payload terenkripsi.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Decrypt request body jika enkripsi aktif (atau baca JSON biasa jika di local)
    const { body, clientPublicKey } = await decryptRequest(request);

    // 2. Validasi input dengan Zod schema
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    // 3. Panggil service login
    const result = await authService.login(parsed.data);

    logger.info({ userId: result.user.id }, "User logged in successfully");

    // 4. Return response (otomatis terenkripsi jika clientPublicKey terisi & ENCRYPTION_ENABLED=true)
    return encryptResponse(
      { success: true, message: "Login successful", data: result },
      clientPublicKey,
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.message, error.statusCode);
    }

    logger.error({ error }, "Unexpected error in POST /api/auth/login");
    return apiError("Internal server error", 500);
  }
}
