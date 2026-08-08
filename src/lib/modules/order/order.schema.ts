import { z } from "zod";
import { OrderStatus } from "@/generated/prisma";

/**
 * Schema validasi untuk single item dalam order request.
 */
export const createOrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required").trim(),
  quantity: z
    .number({
      message: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

/**
 * Schema validasi untuk payload pembuatan order baru (`POST /api/orders`).
 * Status dapat dikirim opsional (default: CONFIRMED).
 */
export const createOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional().default(OrderStatus.CONFIRMED),
  items: z
    .array(createOrderItemSchema)
    .min(1, "Order must contain at least one item"),
});

/**
 * Schema validasi query parameters untuk list order (`GET /api/orders`).
 */
export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
