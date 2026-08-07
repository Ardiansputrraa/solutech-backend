import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { rsaDecrypt, rsaEncrypt } from "./rsa";
import { aesDecrypt, aesEncrypt } from "./aes";
import { apiClientRepository } from "@/lib/modules/api-client/api-client.repository";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

/**
 * Cek apakah enkripsi aktif berdasarkan environment variable.
 * Enkripsi HANYA aktif jika ENCRYPTION_ENABLED=true secara eksplisit.
 * Di local development (env tidak di-set atau false), selalu false.
 */
export function isEncryptionEnabled(): boolean {
  return process.env.ENCRYPTION_ENABLED === "true";
}

/**
 * Format request body terenkripsi yang dikirim oleh client saat ENCRYPTION_ENABLED=true.
 */
interface EncryptedRequestBody {
  encryptedKey: string; // AES session key yang di-encrypt dengan Server RSA Public Key (Base64)
  ciphertext: string; // Payload JSON yang di-encrypt dengan AES session key (Base64)
  iv: string; // IV yang digunakan untuk AES (Base64)
  authTag: string; // AES-GCM authentication tag (Base64)
}

/**
 * Dekripsi body request yang dikirim client.
 *
 * Jika ENCRYPTION_ENABLED=false (local):
 * - Membaca JSON body biasa tanpa enkripsi/dekripsi.
 *
 * Jika ENCRYPTION_ENABLED=true (dev/uat/prod):
 * 1. Verifikasi X-Client-Key header
 * 2. Ambil client public key dari database
 * 3. Decrypt AES session key menggunakan Server RSA Private Key
 * 4. Decrypt body payload menggunakan AES-256-GCM
 */
export async function decryptRequest(request: NextRequest): Promise<{
  body: unknown;
  clientPublicKey: string | null;
}> {
  // Mode Local Development: Skip dekripsi, baca JSON biasa
  if (!isEncryptionEnabled()) {
    const body =
      request.headers.get("content-length") !== "0"
        ? await request.json().catch(() => null)
        : null;
    return { body, clientPublicKey: null };
  }

  // 1. Verifikasi X-Client-Key header
  const clientKey = request.headers.get("X-Client-Key");
  if (!clientKey) {
    throw new AppError("X-Client-Key header is required", 401);
  }

  // 2. Cari client di database
  const apiClient = await apiClientRepository.findByClientKey(clientKey);
  if (!apiClient || !apiClient.isActive || apiClient.revokedAt) {
    logger.warn({ clientKey }, "Unrecognized or revoked X-Client-Key");
    throw new AppError("Invalid or revoked client key", 401);
  }

  // 3. Parse encrypted body
  let encryptedBody: EncryptedRequestBody;
  try {
    encryptedBody = await request.json();
  } catch {
    throw new AppError("Invalid encrypted request body", 400);
  }

  const { encryptedKey, ciphertext, iv, authTag } = encryptedBody;
  if (!encryptedKey || !ciphertext || !iv || !authTag) {
    throw new AppError(
      "Encrypted body must contain: encryptedKey, ciphertext, iv, authTag",
      400
    );
  }

  // 4. Decrypt AES session key menggunakan Server RSA Private Key
  const serverPrivateKeyBase64 = process.env.SERVER_PRIVATE_KEY_BASE64;
  if (!serverPrivateKeyBase64) {
    logger.error("SERVER_PRIVATE_KEY_BASE64 is not configured in environment");
    throw new AppError("Server encryption configuration error", 500);
  }

  const serverPrivateKeyPem = Buffer.from(
    serverPrivateKeyBase64,
    "base64"
  ).toString("utf8");

  let aesKey: Buffer;
  try {
    aesKey = rsaDecrypt(encryptedKey, serverPrivateKeyPem);
  } catch (err) {
    logger.warn({ err, clientKey }, "Failed to decrypt AES session key");
    throw new AppError("Failed to decrypt session key", 400);
  }

  // 5. Decrypt payload dengan AES-256-GCM
  let plaintextJson: string;
  try {
    plaintextJson = aesDecrypt(ciphertext, aesKey, iv, authTag);
  } catch (err) {
    logger.warn({ err, clientKey }, "AES decryption failed — possible tampering");
    throw new AppError("Payload decryption failed", 400);
  }

  return {
    body: JSON.parse(plaintextJson),
    clientPublicKey: apiClient.publicKey,
  };
}

/**
 * Enkripsi response sebelum dikembalikan ke client.
 *
 * Memastikan urutan property JSON selalu RAPI (General info di paling atas):
 * {
 *   "success": boolean,
 *   "statusCode": number,
 *   "message": string,
 *   "data": ...,
 *   "pagination": ...
 * }
 */
export function encryptResponse(
  data: unknown,
  clientPublicKey: string | null,
  status: number = 200
): Response {
  let responsePayload = data;

  if (typeof data === "object" && data !== null) {
    const rawObj = data as Record<string, unknown>;
    const { success, statusCode, message, ...rest } = rawObj;

    responsePayload = {
      success: success ?? true,
      statusCode: statusCode ?? status,
      message: message ?? "Success",
      ...rest,
    };
  }

  if (!isEncryptionEnabled() || !clientPublicKey) {
    return Response.json(responsePayload, { status });
  }

  // 1. Generate ephemeral 256-bit AES key untuk response ini
  const aesKeyBuffer = crypto.randomBytes(32);

  // 2. Encrypt response JSON dengan AES-256-GCM
  const { ciphertext, iv, authTag } = aesEncrypt(
    JSON.stringify(responsePayload),
    aesKeyBuffer
  );

  // 3. Encrypt AES session key dengan Client RSA Public Key dari DB
  const encryptedKey = rsaEncrypt(aesKeyBuffer, clientPublicKey);

  // 4. Return response terenkripsi
  return Response.json(
    { encryptedKey, ciphertext, iv, authTag },
    { status }
  );
}
