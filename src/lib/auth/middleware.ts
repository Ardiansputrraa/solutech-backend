import { type NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "./jwt";
import { apiError } from "@/lib/response/api";

type AuthSuccess = { success: true; user: JwtPayload };
type AuthFailure = { success: false; response: Response };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Guard function untuk memproteksi endpoint dan memverifikasi role (RBAC).
 * Ekstrak dan verifikasi JWT dari header Authorization: Bearer <token>.
 *
 * @param request      - NextRequest object
 * @param allowedRoles - Daftar role yang diizinkan (misal: ["ADMIN"] atau ["ADMIN", "USER"])
 *
 * Cara penggunaan di Route Handler:
 *   const authResult = await withAuth(request, ["ADMIN"]);
 *   if (!authResult.success) return authResult.response;
 *   const { user } = authResult; // type-safe user: { userId, email, role }
 */
export async function withAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<AuthResult> {
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

    // Cek Role-Based Access Control (RBAC) jika allowedRoles dispesifikasikan
    if (
      allowedRoles &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
    ) {
      return {
        success: false,
        response: apiError("Forbidden: You do not have permission.", 403),
      };
    }

    return { success: true, user };
  } catch {
    return {
      success: false,
      response: apiError("Invalid or expired token", 401),
    };
  }
}
