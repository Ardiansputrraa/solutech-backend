import { rsaEncrypt, rsaDecrypt } from "@/lib/crypto/rsa";
import crypto from "node:crypto";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

describe("RSA-OAEP Key Exchange", () => {
  it("should encrypt and decrypt a small payload (AES key simulation)", () => {
    const aesKey = crypto.randomBytes(32);

    const encrypted = rsaEncrypt(aesKey, publicKey);
    const decrypted = rsaDecrypt(encrypted, privateKey);

    expect(decrypted).toEqual(aesKey);
  });

  it("should return Base64 string from rsaEncrypt", () => {
    const data = Buffer.from("test data");
    const encrypted = rsaEncrypt(data, publicKey);

    expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
    expect(typeof encrypted).toBe("string");
  });

  it("should throw error when decrypting with wrong private key", () => {
    const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    const encrypted = rsaEncrypt(Buffer.from("test"), publicKey);
    expect(() => rsaDecrypt(encrypted, wrongPrivateKey)).toThrow();
  });

  it("should encrypt string input correctly", () => {
    const original = "this is a string input";
    const encrypted = rsaEncrypt(original, publicKey);
    const decrypted = rsaDecrypt(encrypted, privateKey);

    expect(decrypted.toString("utf8")).toBe(original);
  });
});
