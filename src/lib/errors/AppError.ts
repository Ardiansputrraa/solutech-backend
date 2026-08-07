/**
 * AppError adalah custom error class untuk error bisnis yang diharapkan (expected errors).
 *
 * Contoh penggunaan:
 * - Invalid email or password (401)
 * - User not found (404)
 * - Validation failed (400)
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;

    // Diperlukan agar instanceof AppError bekerja dengan benar di TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
