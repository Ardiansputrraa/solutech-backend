import "dotenv/config";
import crypto from "node:crypto";
import { rsaEncrypt } from "../src/lib/crypto/rsa";
import { aesEncrypt } from "../src/lib/crypto/aes";
import { DEV_SERVER_PRIVATE_KEY } from "../prisma/seeders/master/client.data";

// Generate RSA Server Public Key dari Private Key untuk keperluan testing CLI
const serverPublicKey = crypto
  .createPublicKey(DEV_SERVER_PRIVATE_KEY)
  .export({ type: "spki", format: "pem" })
  .toString();

const rawArg = process.argv.slice(2).join(" ");
const defaultInput = { email: "admin@solutech.id", password: "Admin@123" };

let jsonString: string;
try {
  if (rawArg) {
    jsonString = JSON.stringify(JSON.parse(rawArg));
  } else {
    jsonString = JSON.stringify(defaultInput);
  }
} catch {
  // Jika argument bukan valid JSON string, gunakan sebagai object dengan email/password
  jsonString = JSON.stringify(defaultInput);
}

// 1. Generate 256-bit AES Key
const aesKey = crypto.randomBytes(32);

// 2. Encrypt JSON payload dengan AES-256-GCM
const { ciphertext, iv, authTag } = aesEncrypt(jsonString, aesKey);

// 3. Encrypt AES Key dengan Server RSA Public Key
const encryptedKey = rsaEncrypt(aesKey, serverPublicKey);

const payload = {
  encryptedKey,
  ciphertext,
  iv,
  authTag,
};

console.log("\n=======================================================");
console.log("   PAYLOAD TERENKRIPSI SIAP DIGUNAKAN DI POSTMAN");
console.log("=======================================================\n");
console.log(JSON.stringify(payload, null, 2));
console.log("\n=======================================================\n");
