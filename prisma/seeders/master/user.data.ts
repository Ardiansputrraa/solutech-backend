import type { UserSeedData } from "../types";

/**
 * Data user yang akan di-seed ke database.
 *
 * PENTING:
 * - `plainPassword` akan di-hash dengan bcrypt (cost factor 10) sebelum disimpan.
 * - File ini BOLEH di-commit ke Git karena hanya berisi credential development.
 * - Untuk production, ganti dengan data yang lebih aman atau gunakan env variable.
 *
 * Data ini menggunakan upsert (berdasarkan email) sehingga aman dijalankan berkali-kali.
 */
export const userData: UserSeedData[] = [
  {
    email: "admin@solutech.id",
    plainPassword: "Admin@123",
    name: "Admin Solutech",
    roleName: "ADMIN",
  },
  {
    email: "user@solutech.id",
    plainPassword: "User@123",
    name: "User Demo",
    roleName: "USER",
  },
];
