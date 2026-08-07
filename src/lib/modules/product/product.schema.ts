import { z } from "zod";

/**
 * Zod Schema untuk validasi request body POST /api/products (Create Product)
 */
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").trim(),
  price: z.number().positive("Price must be greater than zero"),
  stock: z.number().int("Stock must be an integer").nonnegative("Stock cannot be negative"),
  description: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Zod Schema untuk validasi request body PUT /api/products/[id] (Update Product)
 */
export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Zod Schema untuk validasi query parameters GET /api/products (List Products)
 */
export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
