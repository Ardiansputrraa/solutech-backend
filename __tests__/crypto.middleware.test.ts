import { isEncryptionEnabled } from "@/lib/crypto/middleware";

describe("isEncryptionEnabled", () => {
  const originalEnv = process.env.ENCRYPTION_ENABLED;

  afterEach(() => {
    process.env.ENCRYPTION_ENABLED = originalEnv;
  });

  it("should return false when ENCRYPTION_ENABLED is not set", () => {
    delete process.env.ENCRYPTION_ENABLED;
    expect(isEncryptionEnabled()).toBe(false);
  });

  it("should return false when ENCRYPTION_ENABLED is 'false'", () => {
    process.env.ENCRYPTION_ENABLED = "false";
    expect(isEncryptionEnabled()).toBe(false);
  });

  it("should return false when ENCRYPTION_ENABLED is empty string", () => {
    process.env.ENCRYPTION_ENABLED = "";
    expect(isEncryptionEnabled()).toBe(false);
  });

  it("should return true when ENCRYPTION_ENABLED is 'true'", () => {
    process.env.ENCRYPTION_ENABLED = "true";
    expect(isEncryptionEnabled()).toBe(true);
  });

  it("should return false for any value other than 'true' (case sensitive)", () => {
    process.env.ENCRYPTION_ENABLED = "TRUE";
    expect(isEncryptionEnabled()).toBe(false);

    process.env.ENCRYPTION_ENABLED = "1";
    expect(isEncryptionEnabled()).toBe(false);
  });
});
