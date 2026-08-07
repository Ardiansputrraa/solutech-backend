import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth/jwt";
import { authRepository } from "./auth.repository";
import { AppError } from "@/lib/errors/AppError";
import type { LoginInput } from "./auth.schema";

export const authService = {
  /**
   * Mengolah bisnis logik login:
   * 1. Cari user berdasarkan email
   * 2. Verifikasi bcrypt hash password
   * 3. Buat JWT token
   * 4. Return data user & token (PASTIKAN password tidak dikembalikan)
   *
   * @param input - Input email dan password yang sudah divalidasi oleh Zod
   */
  async login(input: LoginInput) {
    // 1. Cari user berdasarkan email
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      // PENTING: Pesan error generik untuk mencegah User Enumeration Attack
      throw new AppError("Invalid email or password", 401);
    }

    // 2. Bandingkan password input dengan bcrypt hash yang tersimpan di DB
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    // 3. Buat token JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    // 4. Return data sukses — TANPA password
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    };
  },
};
