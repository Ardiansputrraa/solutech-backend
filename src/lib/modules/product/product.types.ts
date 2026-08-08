/**
 * product.types.ts
 *
 * DTO (Data Transfer Object) types untuk modul Product.
 * Digunakan sebagai kontrak data antara service layer dan consumer (route handler, test).
 */

export type ProductDTO = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListResult = {
  products: ProductDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
