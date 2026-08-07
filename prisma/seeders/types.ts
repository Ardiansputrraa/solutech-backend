/**
 * Tipe data untuk seed Role — mencerminkan field yang akan di-upsert.
 */
export interface RoleSeedData {
  name: "ADMIN" | "USER";
  description: string;
}

/**
 * Tipe data untuk seed User — password dalam bentuk plain text (akan di-hash di seeder).
 */
export interface UserSeedData {
  email: string;
  plainPassword: string;
  name: string;
  roleName: "ADMIN" | "USER";
}

/**
 * Tipe data untuk seed Product.
 */
export interface ProductSeedData {
  name: string;
  price: number;
  stock: number;
  description?: string;
}
