import crypto from "node:crypto";

/**
 * Decrypt data yang di-encrypt oleh client menggunakan RSA-OAEP + SHA-256.
 * Digunakan untuk mendekripsi AES session key yang dikirim client.
 *
 * @param encryptedBase64 - Data terenkripsi dalam format Base64
 * @param privateKeyPem   - Server RSA Private Key dalam format PEM
 */
export function rsaDecrypt(encryptedBase64: string, privateKeyPem: string): Buffer {
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  return crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedBuffer
  );
}

/**
 * Encrypt data menggunakan RSA-OAEP + SHA-256.
 * Digunakan untuk mengenkripsi AES session key response dengan Client Public Key.
 *
 * @param data         - Data yang akan dienkripsi (Buffer atau string)
 * @param publicKeyPem - Client RSA Public Key dalam format PEM
 */
export function rsaEncrypt(data: Buffer | string, publicKeyPem: string): string {
  const buffer = typeof data === "string" ? Buffer.from(data) : data;
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  );
  return encrypted.toString("base64");
}
