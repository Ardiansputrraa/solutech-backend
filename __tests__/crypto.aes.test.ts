import { aesEncrypt, aesDecrypt } from "@/lib/crypto/aes";
import crypto from "node:crypto";

describe("AES-256-GCM Encryption", () => {
  const key = crypto.randomBytes(32); // 256-bit key

  describe("aesEncrypt", () => {
    it("should return ciphertext, iv, and authTag", () => {
      const result = aesEncrypt("hello world", key);

      expect(result).toHaveProperty("ciphertext");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("authTag");
      expect(typeof result.ciphertext).toBe("string");
      expect(typeof result.iv).toBe("string");
      expect(typeof result.authTag).toBe("string");
    });

    it("should produce different ciphertext for same plaintext (due to random IV)", () => {
      const result1 = aesEncrypt("hello world", key);
      const result2 = aesEncrypt("hello world", key);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });
  });

  describe("aesDecrypt", () => {
    it("should correctly decrypt an encrypted value", () => {
      const plaintext = '{"name":"Laptop","price":15000000}';
      const { ciphertext, iv, authTag } = aesEncrypt(plaintext, key);

      const decrypted = aesDecrypt(ciphertext, key, iv, authTag);
      expect(decrypted).toBe(plaintext);
    });

    it("should throw error if authTag is tampered (integrity check)", () => {
      const { ciphertext, iv } = aesEncrypt("sensitive data", key);
      const invalidAuthTag = Buffer.alloc(16, 0).toString("base64");

      expect(() => aesDecrypt(ciphertext, key, iv, invalidAuthTag)).toThrow();
    });

    it("should throw error if ciphertext is tampered", () => {
      const { iv, authTag } = aesEncrypt("sensitive data", key);
      const tamperedCiphertext = Buffer.alloc(20, 0).toString("base64");

      expect(() => aesDecrypt(tamperedCiphertext, key, iv, authTag)).toThrow();
    });

    it("should throw error if wrong key is used", () => {
      const { ciphertext, iv, authTag } = aesEncrypt("sensitive data", key);
      const wrongKey = crypto.randomBytes(32);

      expect(() => aesDecrypt(ciphertext, wrongKey, iv, authTag)).toThrow();
    });
  });

  it("should handle empty string", () => {
    const { ciphertext, iv, authTag } = aesEncrypt("", key);
    const decrypted = aesDecrypt(ciphertext, key, iv, authTag);
    expect(decrypted).toBe("");
  });

  it("should handle JSON payload correctly (end-to-end)", () => {
    const payload = JSON.stringify({ userId: "u1", items: [{ id: "p1", qty: 2 }] });
    const { ciphertext, iv, authTag } = aesEncrypt(payload, key);
    const decrypted = aesDecrypt(ciphertext, key, iv, authTag);
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
  });
});
