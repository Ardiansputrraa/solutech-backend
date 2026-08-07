import type { RoleSeedData } from "../types";

/**
 * Data role yang akan di-seed ke database.
 *
 * Aturan:
 * - ADMIN  : akses penuh — CRUD product, melihat semua order
 * - USER   : akses terbatas — hanya membuat dan melihat order sendiri
 *
 * Data ini menggunakan upsert sehingga aman dijalankan berkali-kali
 * tanpa membuat duplikat.
 */
export const roleData: RoleSeedData[] = [
  {
    name: "ADMIN",
    description: "Administrator — akses penuh ke seluruh fitur sistem",
  },
  {
    name: "USER",
    description: "User biasa — hanya dapat membuat dan melihat order sendiri",
  },
];
