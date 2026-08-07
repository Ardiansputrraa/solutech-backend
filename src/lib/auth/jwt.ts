import jwt from "jsonwebtoken";
import { AppError } from "@/lib/errors/AppError";

/**
 * Payload yang disimpan dalam token JWT.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Membuat token JWT untuk user yang berhasil login.
 * Secret diambil dari environment variable JWT_SECRET.
 */
export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifikasi token JWT dari header Authorization.
 * Melempar AppError(401) jika token expired atau invalid.
 */
export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}
