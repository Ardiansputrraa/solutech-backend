import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response/api";
import { rsaEncrypt } from "@/lib/crypto/rsa";
import { aesEncrypt } from "@/lib/crypto/aes";
import { apiClientRepository } from "@/lib/modules/api-client/api-client.repository";
import { DEV_CLIENT_PUBLIC_KEY } from "../../../../../prisma/seeders/master/client.data";

/**
 * POST /api/dev/encrypt
 *
 * Utility Endpoint untuk Tester / Developer (HANYA AKTIF di Dev & UAT, 404 di Production).
 * Mengubah Plain JSON payload biasa menjadi format payload terenkripsi (RSA + AES-256-GCM).
 */
export async function POST(request: NextRequest) {
  // Keamanan: Tolak di environment Production
  if (process.env.NODE_ENV === "production") {
    return apiError("Endpoint not available in production", 404);
  }

  try {
    const body = await request.json();
    const clientKey = request.headers.get("X-Client-Key") ?? "CLIENT_SOLUTECH_DEV_01";

    // 1. Cari public key client dari database
    const client = await apiClientRepository.findByClientKey(clientKey);
    const publicKeyPem = client?.publicKey ?? DEV_CLIENT_PUBLIC_KEY;

    // 2. Encrypt JSON payload dengan AES-256-GCM
    const jsonString = JSON.stringify(body);
    const aesKey = crypto.randomBytes(32);
    const { ciphertext, iv, authTag } = aesEncrypt(jsonString, aesKey);

    // 3. Encrypt AES Key dengan RSA Public Key
    const encryptedKey = rsaEncrypt(aesKey, publicKeyPem);

    return apiSuccess(
      {
        clientKey,
        encryptedPayload: {
          encryptedKey,
          ciphertext,
          iv,
          authTag,
        },
      },
      "Payload encrypted successfully"
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Encryption failed",
      400
    );
  }
}
