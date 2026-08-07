import crypto from "node:crypto";

const AES_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bit — standar untuk GCM mode
const TAG_LENGTH = 16; // 128 bit authentication tag

/**
 * Hasil enkripsi AES-256-GCM.
 * IV dan Auth Tag harus dikirim bersama ciphertext untuk dekripsi.
 */
export interface AesEncryptResult {
  ciphertext: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
}

/**
 * Encrypt data menggunakan AES-256-GCM.
 * Menggunakan key 256-bit dan IV acak unik untuk setiap enkripsi.
 *
 * @param plaintext - String atau JSON string yang akan dienkripsi
 * @param key       - AES key dalam format Buffer (32 bytes / 256 bits)
 */
export function aesEncrypt(plaintext: string, key: Buffer): AesEncryptResult {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypt data yang di-encrypt menggunakan AES-256-GCM.
 * Akan melempar error jika auth tag tidak valid (data tampering terdeteksi).
 *
 * @param ciphertext - Data terenkripsi dalam Base64
 * @param key        - AES key dalam Buffer (32 bytes)
 * @param iv         - IV yang digunakan saat enkripsi (Base64)
 * @param authTag    - Authentication tag untuk verifikasi integritas (Base64)
 */
export function aesDecrypt(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): string {
  const decipher = crypto.createDecipheriv(
    AES_ALGORITHM,
    key,
    Buffer.from(iv, "base64"),
    { authTagLength: TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
