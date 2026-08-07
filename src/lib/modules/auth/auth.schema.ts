import { z } from "zod";

/**
 * Zod Schema untuk validasi request payload endpoint POST /api/auth/login.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
