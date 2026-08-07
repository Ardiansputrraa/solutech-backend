import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response/api";
import { rsaDecrypt } from "@/lib/crypto/rsa";
import { aesDecrypt } from "@/lib/crypto/aes";
import { DEV_SERVER_PRIVATE_KEY } from "../../../../../prisma/seeders/master/client.data";

/**
 * POST /api/dev/decrypt
 *
 * Utility Endpoint untuk Tester / Developer (HANYA AKTIF di Dev & UAT, 404 di Production).
 * Mendekripsi payload terenkripsi ({ encryptedKey, ciphertext, iv, authTag }) kembali menjadi Plain JSON biasa.
 */
export async function POST(request: NextRequest) {
  // Keamanan: Tolak di environment Production
  if (process.env.NODE_ENV === "production") {
    return apiError("Endpoint not available in production", 404);
  }

  try {
    const body = await request.json();
    const { encryptedKey, ciphertext, iv, authTag } = body;

    if (!encryptedKey || !ciphertext || !iv || !authTag) {
      return apiError(
        "Payload must contain: encryptedKey, ciphertext, iv, authTag",
        400
      );
    }

    // Ambil Private Key
    const serverPrivateKeyBase64 = process.env.SERVER_PRIVATE_KEY_BASE64;
    const privateKeyPem = serverPrivateKeyBase64
      ? Buffer.from(serverPrivateKeyBase64, "base64").toString("utf8")
      : DEV_SERVER_PRIVATE_KEY;

    // 1. Decrypt AES Key dengan RSA Private Key
    const aesKey = rsaDecrypt(encryptedKey, privateKeyPem);

    // 2. Decrypt Payload dengan AES-256-GCM
    const plaintextJson = aesDecrypt(ciphertext, aesKey, iv, authTag);

    return apiSuccess(
      {
        decryptedPayload: JSON.parse(plaintextJson),
      },
      "Payload decrypted successfully"
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Decryption failed",
      400
    );
  }
}
