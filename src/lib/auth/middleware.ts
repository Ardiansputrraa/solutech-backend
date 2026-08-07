import { type NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "./jwt";
import { apiError } from "@/lib/response/api";

type AuthSuccess = { success: true; user: JwtPayload };
type AuthFailure = { success: false; response: Response };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Guard function untuk melindungi endpoint.
 * Ekstrak dan verifikasi JWT dari header Authorization: Bearer <token>.
 *
 * Cara penggunaan di Route Handler:
 *   const authResult = await withAuth(request);
 *   if (!authResult.success) return authResult.response;
 *   const { user } = authResult; // type-safe
 */
export async function withAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return {
      success: false,
      response: apiError("Authorization token required", 401),
    };
  }

  try {
    const user = verifyToken(token);
    return { success: true, user };
  } catch {
    return {
      success: false,
      response: apiError("Invalid or expired token", 401),
    };
  }
}
