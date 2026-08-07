# SOLUTECH BACKEND — AGENT CODING STANDARDS

> Dokumen ini adalah **hukum tertinggi** untuk seluruh penulisan kode di project ini.
> Setiap agent **wajib** membaca dan mematuhi seluruh aturan sebelum menulis satu baris kode pun.
> Jangan mengarang, jangan berasumsi, jangan melewati langkah verifikasi.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## DAFTAR ISI

1. [Aturan Utama Agent](#1-aturan-utama-agent)
2. [Tech Stack & Versi](#2-tech-stack--versi)
3. [Struktur Direktori](#3-struktur-direktori)
4. [Arsitektur Layered](#4-arsitektur-layered)
5. [Database & Prisma](#5-database--prisma)
6. [Autentikasi JWT](#6-autentikasi-jwt)
7. [Validasi Input (Zod)](#7-validasi-input-zod)
8. [Error Handling](#8-error-handling)
9. [Response Format](#9-response-format)
10. [Modul Product](#10-modul-product)
11. [Modul Order](#11-modul-order)
12. [Redis Caching](#12-redis-caching)
13. [Logging (Pino)](#13-logging-pino)
14. [Unit Testing (Jest)](#14-unit-testing-jest)
15. [Environment Variables](#15-environment-variables)
16. [Konvensi Penamaan](#16-konvensi-penamaan)
17. [Git & Commit](#17-git--commit)
18. [Checklist Sebelum Commit](#18-checklist-sebelum-commit)
19. [API Payload Encryption](#19-api-payload-encryption)

---

## 1. Aturan Utama Agent

### 1.1 Wajib Verifikasi Sebelum Menulis Kode

Sebelum menulis kode apapun, agent **harus**:

1. **Baca file docs Next.js** yang relevan di `node_modules/next/dist/docs/` — terutama untuk Route Handler, karena `params` sekarang berupa **Promise** (breaking change di Next.js 15+).
2. **Verifikasi versi package** di `package.json` — jangan asumsikan API berdasarkan versi lama.
3. **Baca schema Prisma** di `prisma/schema.prisma` — jangan asumsikan nama field atau relasi.
4. **Baca file yang ada** sebelum membuat file baru — cek duplikasi.

### 1.2 Larangan Keras (DILARANG)

- DILARANG menulis kode tanpa membaca docs versi yang terinstall.
- DILARANG menggunakan `params` tanpa `await` di Route Handler (breaking change Next.js 15+).
- DILARANG menggunakan `searchParams` tanpa `await` di Route Handler.
- DILARANG menghardcode secret, URL, atau credential — selalu pakai `process.env`.
- DILARANG melakukan query database langsung di Route Handler — harus lewat Repository.
- DILARANG menulis business logic di Repository — hanya query database.
- DILARANG menggunakan `any` type di TypeScript tanpa alasan yang sangat kuat.
- DILARANG melakukan `console.log` di production code — gunakan Pino logger.
- DILARANG mengembalikan password atau data sensitif dalam response API.
- DILARANG skip validasi Zod — setiap endpoint yang menerima input **wajib** divalidasi.
- DILARANG melakukan operasi Order tanpa database transaction.
- DILARANG membuat file di luar struktur direktori yang telah ditentukan.

### 1.3 Prinsip Clean Code

- **Single Responsibility**: Setiap file/fungsi hanya bertanggung jawab untuk satu hal.
- **DRY (Don't Repeat Yourself)**: Buat utility jika logika dipakai lebih dari satu kali.
- **Naming yang jelas**: Nama variabel/fungsi harus self-explanatory, tidak perlu komentar untuk menjelaskan *apa*.
- **Komentar hanya untuk *mengapa***: Komentar diperbolehkan untuk menjelaskan alasan desain, bukan kode yang sudah jelas.
- **Fail fast**: Validasi dan lempar error lebih awal daripada terlambat.

---

## 2. Tech Stack & Versi

Gunakan **hanya** teknologi yang terdaftar di `package.json`. Jangan install package baru tanpa persetujuan.

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Next.js | `16.3.0` | App Router + Route Handlers (backend API) |
| TypeScript | `^5` | Type safety |
| Prisma Client | `^7.9.1` | ORM — query database |
| Prisma (CLI) | `^7.9.1` | Migration & seeding |
| PostgreSQL | `16` (Docker) | Database utama |
| Zod | `^4.4.3` | Validasi input/schema |
| jsonwebtoken | `^9.0.3` | JWT sign & verify |
| bcrypt | `^6.0.0` | Password hashing |
| ioredis | `^6.0.0` | Redis client (caching opsional) |
| pino | `^10.3.1` | Structured logging |
| Jest | `^30.4.2` | Unit testing |
| ts-jest | `^29.4.12` | TypeScript support untuk Jest |

> **Catatan Prisma**: Generator menggunakan `prisma-client` bukan `prisma-client-js`.
> Output client di `src/generated/prisma`. Import selalu dari path ini.

---

## 3. Struktur Direktori

Ikuti struktur ini **persis**. Jangan membuat direktori baru tanpa alasan yang jelas.

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── route.ts        # POST /api/auth/login
│   │   ├── products/
│   │   │   ├── route.ts            # GET (list+search+pagination), POST
│   │   │   └── [id]/
│   │   │       └── route.ts        # GET (detail), PUT, DELETE (soft delete)
│   │   └── orders/
│   │       ├── route.ts            # POST (create order)
│   │       └── [id]/
│   │           └── route.ts        # GET (detail order)
│   ├── layout.tsx
│   └── page.tsx
│
├── generated/
│   └── prisma/                     # Auto-generated Prisma Client (jangan edit manual)
│
└── lib/
    ├── db/
    │   └── prisma.ts               # Singleton Prisma Client instance
    ├── redis/
    │   └── client.ts               # Singleton Redis Client instance (opsional)
    ├── auth/
    │   ├── jwt.ts                  # JWT sign & verify utilities
    │   └── middleware.ts           # Auth guard — validasi token dari request
    ├── errors/
    │   └── AppError.ts             # Custom error class
    ├── response/
    │   └── api.ts                  # Helper fungsi response konsisten
    ├── logger/
    │   └── index.ts                # Pino logger instance
    ├── config/
    │   └── env.ts                  # Environment variable validation
    │
    └── modules/
        ├── auth/
        │   ├── auth.schema.ts      # Zod schemas untuk auth
        │   ├── auth.repository.ts  # Query user ke DB
        │   └── auth.service.ts     # Login logic, password compare, JWT sign
        │
        ├── product/
        │   ├── product.schema.ts   # Zod schemas untuk product
        │   ├── product.repository.ts
        │   └── product.service.ts
        │
        └── order/
            ├── order.schema.ts     # Zod schemas untuk order
            ├── order.repository.ts
            └── order.service.ts

prisma/
├── schema.prisma                   # Definisi model database
├── migrations/                     # Auto-generated migration files
└── seed.ts                         # Data seeding

__tests__/
├── product.service.test.ts
└── order.service.test.ts
```

---

## 4. Arsitektur Layered

Project menggunakan **3 layer** yang wajib diikuti. Data hanya boleh mengalir **satu arah ke bawah**.

```
Route Handler  (app/api/***/route.ts)
      |
      v  memanggil
Service        (lib/modules/**/*.service.ts)
      |
      v  memanggil
Repository     (lib/modules/**/*.repository.ts)
      |
      v  memanggil
Prisma Client  (lib/db/prisma.ts)
```

### 4.1 Route Handler — Tanggung Jawab

- Menerima `Request`, mengekstrak body/params/query.
- Memanggil auth guard jika endpoint protected.
- Validasi input dengan Zod schema.
- Memanggil **satu** fungsi service.
- Mengembalikan `Response` yang sesuai.
- **TIDAK BOLEH** berisi business logic.
- **TIDAK BOLEH** langsung memanggil Prisma.

```typescript
// BENAR — Route Handler yang bersih
// src/app/api/products/route.ts
import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { apiSuccess, apiError } from "@/lib/response/api";
import { productService } from "@/lib/modules/product/product.service";
import { listProductSchema } from "@/lib/modules/product/product.schema";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  // 1. Auth guard
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    // 2. Parse & validasi query params
    const { searchParams } = request.nextUrl;
    const parsed = listProductSchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
    });
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    // 3. Panggil service
    const result = await productService.listProducts(parsed.data);

    // 4. Return response
    return apiSuccess(result, "Products retrieved", 200);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "GET /api/products failed");
    return apiError("Internal server error", 500);
  }
}
```

### 4.2 Service — Tanggung Jawab

- Berisi **business logic** murni.
- Memanggil repository untuk akses data.
- Melempar `AppError` jika ada kondisi bisnis yang tidak terpenuhi.
- Mengorkestrasi transaksi database (untuk Order).
- **TIDAK BOLEH** langsung mengakses `prisma` kecuali untuk `$transaction`.
- **TIDAK BOLEH** mengakses `Request` object.

```typescript
// BENAR — Service dengan business logic
// src/lib/modules/product/product.service.ts
import { productRepository } from "./product.repository";
import { AppError } from "@/lib/errors/AppError";
import type { CreateProductInput, ListProductQuery } from "./product.schema";

export const productService = {
  async listProducts(query: ListProductQuery) {
    // Business logic: pastikan page minimal 1
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 10); // batas max 100

    return productRepository.findMany({ ...query, page, limit });
  },

  async createProduct(input: CreateProductInput) {
    // Business logic: validasi stok tidak boleh negatif (Zod sudah handle,
    // tapi ini contoh double-check di layer service)
    if (input.stock < 0) throw new AppError("Stock cannot be negative", 400);

    return productRepository.create(input);
  },

  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError("Product not found", 404);
    return product;
  },

  async updateProduct(id: string, input: Partial<CreateProductInput>) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new AppError("Product not found", 404);
    return productRepository.update(id, input);
  },

  async deleteProduct(id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new AppError("Product not found", 404);
    return productRepository.softDelete(id);
  },
};
```

### 4.3 Repository — Tanggung Jawab

- Hanya berisi **query Prisma** — tidak ada logic bisnis.
- Setiap method mewakili satu operasi database.
- Menerima plain object sebagai parameter, mengembalikan data dari Prisma.
- Selalu filter soft delete dengan `deletedAt: null`.

```typescript
// BENAR — Repository yang bersih
// src/lib/modules/product/product.repository.ts
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma";

export const productRepository = {
  async findMany(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,              // soft delete filter — SELALU ada
      ...(search && {
        name: { contains: search, mode: "insensitive" },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByName(name: string) {
    return prisma.product.findFirst({
      where: { name, deletedAt: null },
    });
  },

  async create(data: Omit<Prisma.ProductCreateInput, "id" | "createdAt" | "updatedAt">) {
    return prisma.product.create({ data });
  },

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
```

---

## 5. Database & Prisma

### 5.1 Prisma Client Singleton

Selalu gunakan singleton untuk menghindari koneksi berlebih di Next.js (hot reload membuat instance baru).

```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from "@/generated/prisma";

// Extend globalThis untuk menyimpan instance singleton saat development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

// Di production, globalForPrisma tidak diisi agar tidak leak memori
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 5.2 Schema Prisma — Aturan

Setiap model **wajib** memiliki:
- `id` — gunakan `@id @default(cuid())`.
- `createdAt` dan `updatedAt` — gunakan `@default(now())` dan `@updatedAt`.
- Soft delete: model yang perlu soft delete **wajib** memiliki `deletedAt DateTime?`.
- Nama tabel dalam `@@map` menggunakan `snake_case`.

```prisma
// prisma/schema.prisma — schema lengkap

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  // PENTING: field ini menyimpan bcrypt hash, BUKAN plain text password
  password  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]

  @@map("users")
}

model Product {
  id          String      @id @default(cuid())
  name        String
  // Gunakan Decimal untuk uang, bukan Float (menghindari floating point error)
  price       Decimal     @db.Decimal(10, 2)
  stock       Int         @default(0)
  description String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  // Soft delete: null berarti aktif, terisi berarti sudah dihapus
  deletedAt   DateTime?

  orderItems  OrderItem[]

  @@map("products")
}

model Order {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  totalPrice Decimal     @db.Decimal(10, 2)
  status     OrderStatus @default(PENDING)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  items      OrderItem[]

  @@map("orders")
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  // unitPrice disimpan berdasarkan harga SAAT ORDER DIBUAT, bukan harga saat ini
  // Ini penting agar laporan keuangan historis tidak berubah
  unitPrice Decimal @db.Decimal(10, 2)

  @@map("order_items")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  CANCELLED
}
```

### 5.3 Transaction untuk Order — WAJIB

**WAJIB** gunakan `prisma.$transaction` untuk seluruh proses pembuatan order.
Jika transaksi gagal di langkah manapun, Prisma otomatis me-rollback semua perubahan.

```typescript
// src/lib/modules/order/order.service.ts
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/AppError";
import type { CreateOrderInput } from "./order.schema";

export const orderService = {
  async createOrder(userId: string, input: CreateOrderInput) {
    // Seluruh operasi di dalam callback ini berjalan dalam satu transaction
    return prisma.$transaction(async (tx) => {
      // Langkah 1: Ambil semua produk yang dipesan dalam satu query
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      });

      // Langkah 2: Validasi semua produk ditemukan
      if (products.length !== productIds.length) {
        throw new AppError("One or more products not found or have been deleted", 404);
      }

      // Langkah 3: Validasi stok dan hitung total harga
      let totalPrice = 0;
      for (const item of input.items) {
        const product = products.find((p) => p.id === item.productId)!;
        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product: "${product.name}". Available: ${product.stock}`,
            400
          );
        }
        totalPrice += Number(product.price) * item.quantity;
      }

      // Langkah 4: Buat record Order dan OrderItems sekaligus
      const order = await tx.order.create({
        data: {
          userId,
          totalPrice,
          items: {
            create: input.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price, // simpan harga saat order, bukan harga saat ini
              };
            }),
          },
        },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, price: true } } },
          },
        },
      });

      // Langkah 5: Kurangi stok setiap produk
      await Promise.all(
        input.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );

      return order;
      // Jika ada error di atas → seluruh transaction di-rollback otomatis oleh Prisma
    });
  },
};
```

### 5.4 Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed user admin — gunakan upsert agar idempotent (aman dijalankan berkali-kali)
  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@solutech.id" },
    update: {},
    create: {
      email: "admin@solutech.id",
      password: hashedPassword,
      name: "Admin Solutech",
    },
  });

  // Seed sample products
  const products = [
    { name: "Laptop Pro X", price: 15000000, stock: 10, description: "High performance laptop" },
    { name: "Wireless Mouse", price: 250000, stock: 50, description: "Ergonomic wireless mouse" },
    { name: "Mechanical Keyboard", price: 800000, stock: 25, description: "RGB mechanical keyboard" },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product as never });
  }

  console.log("Seeding selesai.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 6. Autentikasi JWT

### 6.1 JWT Utility

```typescript
// src/lib/auth/jwt.ts
import jwt from "jsonwebtoken";
import { AppError } from "@/lib/errors/AppError";

// Tipe payload yang disimpan di dalam JWT token
export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");

  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    // Tangkap semua jwt error (expired, invalid signature, dll) dan ubah ke AppError
    throw new AppError("Invalid or expired token", 401);
  }
}
```

### 6.2 Auth Middleware (Guard)

```typescript
// src/lib/auth/middleware.ts
import { type NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "./jwt";
import { apiError } from "@/lib/response/api";

// Discriminated union type untuk hasil auth guard
type AuthSuccess = { success: true; user: JwtPayload };
type AuthFailure = { success: false; response: Response };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Guard function untuk melindungi endpoint.
 * Ekstrak dan verifikasi JWT dari header Authorization: Bearer <token>.
 *
 * Cara pakai di Route Handler:
 *   const authResult = await withAuth(request);
 *   if (!authResult.success) return authResult.response;
 *   const { user } = authResult; // sudah type-safe
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
```

### 6.3 Login Route Handler dan Service

```typescript
// src/lib/modules/auth/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

```typescript
// src/lib/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth/jwt";
import { authRepository } from "./auth.repository";
import { AppError } from "@/lib/errors/AppError";
import type { LoginInput } from "./auth.schema";

export const authService = {
  async login(input: LoginInput) {
    // 1. Cari user — jangan beri tahu user mana yang tidak ada
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new AppError("Invalid email or password", 401);

    // 2. Bandingkan password dengan hash yang tersimpan
    const isValid = await bcrypt.compare(input.password, user.password);
    // PENTING: pesan error sengaja sama dengan di atas untuk mencegah user enumeration attack
    if (!isValid) throw new AppError("Invalid email or password", 401);

    // 3. Buat JWT token
    const token = signToken({ userId: user.id, email: user.email });

    // 4. Return token dan data user — PASTIKAN password tidak ikut dikembalikan
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  },
};
```

---

## 7. Validasi Input (Zod)

### 7.1 Aturan Zod

- Setiap endpoint yang menerima input **wajib** memiliki Zod schema.
- Schema disimpan di file `*.schema.ts` dalam direktori module yang sesuai.
- Export type yang diinfer dari schema untuk digunakan di service dan repository.
- Gunakan `safeParse` (bukan `parse`) agar error bisa dikontrol, bukan throw exception.

```typescript
// src/lib/modules/product/product.schema.ts
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  price: z.number().positive("Price must be greater than 0"),
  stock: z.number().int("Stock must be an integer").min(0, "Stock cannot be negative"),
  description: z.string().optional(),
});

// partial() membuat semua field opsional untuk update
export const updateProductSchema = createProductSchema.partial();

// coerce.number() mengkonversi string dari query params ke number otomatis
export const listProductSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductQuery = z.infer<typeof listProductSchema>;
```

```typescript
// src/lib/modules/order/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().positive("Quantity must be at least 1"),
      })
    )
    .min(1, "Order must have at least one item"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

### 7.2 Cara Menggunakan Zod di Route Handler

```typescript
// Selalu gunakan safeParse — bukan parse — agar tidak throw exception
const parsed = createProductSchema.safeParse(body);

if (!parsed.success) {
  // flatten() mengubah ZodError menjadi format yang mudah dibaca client
  return apiError("Validation failed", 400, parsed.error.flatten());
}

// parsed.data sudah type-safe sesuai schema
const result = await productService.createProduct(parsed.data);
```

---

## 8. Error Handling

### 8.1 Custom Error Class

```typescript
// src/lib/errors/AppError.ts

/**
 * AppError adalah custom error class untuk error yang DIHARAPKAN (expected errors).
 *
 * Gunakan ini untuk kondisi bisnis yang gagal, contoh:
 * - Product not found (404)
 * - Insufficient stock (400)
 * - Duplicate data (409)
 *
 * Error ini akan ditangkap di Route Handler dan diubah menjadi response HTTP yang sesuai.
 * Error yang TIDAK diharapkan (bug, DB connection error, dll) biarkan sebagai Error biasa
 * dan tangkap terpisah untuk di-log dan dikembalikan sebagai 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;

    // Diperlukan agar instanceof AppError bekerja dengan benar di TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 8.2 Pola Error Handler di Route Handler

Gunakan pola `try/catch` yang **konsisten** di setiap Route Handler.

```typescript
// BENAR — pola try/catch standar yang dipakai di semua Route Handler
export async function POST(request: NextRequest) {
  try {
    // ... logika handler
  } catch (error) {
    if (error instanceof AppError) {
      // Error bisnis yang diharapkan — kembalikan pesan ke client
      return apiError(error.message, error.statusCode, error.details);
    }
    // Error yang tidak diharapkan (bug, DB error, dll)
    // Log detail errornya, tapi jangan expose ke client
    logger.error({ error }, "Unexpected error in POST /api/products");
    return apiError("Internal server error", 500);
  }
}
```

### 8.3 HTTP Status Code Standard

| Situasi | Status Code |
|---|---|
| Sukses — data dikembalikan | `200 OK` |
| Sukses — resource baru dibuat | `201 Created` |
| Validasi input gagal | `400 Bad Request` |
| Stok tidak cukup (business rule) | `400 Bad Request` |
| Token tidak ada atau tidak valid | `401 Unauthorized` |
| Resource tidak ditemukan | `404 Not Found` |
| Konflik (data duplikat) | `409 Conflict` |
| Error server yang tidak terduga | `500 Internal Server Error` |

---

## 9. Response Format

### 9.1 Helper Response

**Semua** endpoint harus menggunakan helper ini untuk format response yang konsisten.

```typescript
// src/lib/response/api.ts

/**
 * Format response sukses:
 * { success: true, message: string, data: T }
 *
 * Format response error:
 * { success: false, message: string, errors?: unknown }
 */

export function apiSuccess<T>(
  data: T,
  message: string = "Success",
  status: number = 200
): Response {
  return Response.json({ success: true, message, data }, { status });
}

export function apiError(
  message: string,
  status: number = 500,
  errors?: unknown
): Response {
  const body = { success: false, message, ...(errors !== undefined && { errors }) };
  return Response.json(body, { status });
}
```

### 9.2 Contoh Response JSON

Response sukses list products:
```json
{
  "success": true,
  "message": "Products retrieved",
  "data": {
    "data": [{ "id": "clx123", "name": "Laptop Pro X", "price": "15000000.00", "stock": 10 }],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

Response error validasi:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fieldErrors": { "price": ["Price must be greater than 0"] },
    "formErrors": []
  }
}
```

Response error not found:
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## 10. Modul Product

### 10.1 Endpoint yang Wajib Diimplementasikan

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/api/products` | List products (pagination + search) | Wajib |
| `POST` | `/api/products` | Buat product baru | Wajib |
| `GET` | `/api/products/[id]` | Detail satu product | Wajib |
| `PUT` | `/api/products/[id]` | Update product | Wajib |
| `DELETE` | `/api/products/[id]` | Soft delete product | Wajib |

### 10.2 Aturan Wajib Product

- **Soft Delete**: `DELETE` hanya mengisi `deletedAt = now()`, tidak menghapus record dari DB.
- **Filter Soft Delete**: SETIAP query yang membaca product WAJIB menyertakan `where: { deletedAt: null }`.
- **Pagination**: Response list harus menyertakan `total`, `page`, `limit`, dan `data`.
- **Search**: Parameter `?search=` melakukan case-insensitive search pada field `name`.
- **Price**: Gunakan tipe `Decimal` di Prisma. Saat dikalkulasi di JS, konversi ke `Number()`.

### 10.3 Contoh Route Handler Product Detail — Perhatikan await params

```typescript
// src/app/api/products/[id]/route.ts
import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { apiSuccess, apiError } from "@/lib/response/api";
import { productService } from "@/lib/modules/product/product.service";
import { updateProductSchema } from "@/lib/modules/product/product.schema";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

// PERHATIAN: params adalah Promise di Next.js 15+ — WAJIB await sebelum diakses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params; // WAJIB await params
    const product = await productService.getProductById(id);
    return apiSuccess(product, "Product retrieved");
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "GET /api/products/[id] failed");
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params; // WAJIB await params
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const updated = await productService.updateProduct(id, parsed.data);
    return apiSuccess(updated, "Product updated");
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "PUT /api/products/[id] failed");
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params; // WAJIB await params
    await productService.deleteProduct(id);
    return apiSuccess(null, "Product deleted");
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "DELETE /api/products/[id] failed");
    return apiError("Internal server error", 500);
  }
}
```

---

## 11. Modul Order

### 11.1 Endpoint yang Wajib Diimplementasikan

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `POST` | `/api/orders` | Buat order baru | Wajib |
| `GET` | `/api/orders/[id]` | Detail satu order | Wajib |

### 11.2 Aturan Wajib Order

- **Transaction Wajib**: Seluruh proses (baca produk, validasi stok, buat order, kurangi stok) HARUS dalam satu `prisma.$transaction`.
- **Harga Historis**: Simpan `unitPrice` di `OrderItem` berdasarkan harga saat order dibuat. Jika harga product berubah nanti, data order lama tidak boleh ikut berubah.
- **Validasi Stok**: Cek stok sebelum buat order. Jika tidak cukup, throw `AppError(400)`.
- **Rollback Otomatis**: Jika ada error di dalam `$transaction`, semua perubahan dibatalkan.

### 11.3 Contoh Route Handler Order

```typescript
// src/app/api/orders/route.ts
import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { apiSuccess, apiError } from "@/lib/response/api";
import { orderService } from "@/lib/modules/order/order.service";
import { createOrderSchema } from "@/lib/modules/order/order.schema";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  // 1. Autentikasi — ambil userId dari token
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    // 2. Parse dan validasi request body
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    // 3. Buat order — userId diambil dari JWT, bukan dari request body (security)
    const order = await orderService.createOrder(authResult.user.userId, parsed.data);

    return apiSuccess(order, "Order created successfully", 201);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "POST /api/orders failed");
    return apiError("Internal server error", 500);
  }
}
```

---

## 12. Redis Caching

> Fitur opsional (nilai tambah). Implementasikan jika waktu memungkinkan.

### 12.1 Redis Client Singleton

```typescript
// src/lib/redis/client.ts
import Redis from "ioredis";
import logger from "@/lib/logger";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

redis.on("error", (err) => {
  // Log error tapi jangan crash — Redis adalah cache, bukan database utama
  logger.error({ err }, "Redis connection error");
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

### 12.2 Pola Cache — Selalu Fail Gracefully

Jika Redis gagal (down, timeout, dll), aplikasi harus tetap berjalan dengan fallback ke database.

```typescript
// Pola cache yang benar di service
async listProducts(query: ListProductQuery) {
  const cacheKey = `products:list:page=${query.page}:limit=${query.limit}:search=${query.search ?? ""}`;

  // Coba baca dari cache — jangan crash jika Redis error
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn({ err }, "Redis get failed, falling back to database");
  }

  // Cache miss atau Redis error — query database
  const result = await productRepository.findMany(query);

  // Simpan ke cache — jangan crash jika Redis error
  try {
    await redis.setex(cacheKey, 60, JSON.stringify(result)); // TTL 60 detik
  } catch (err) {
    logger.warn({ err }, "Redis set failed, skipping cache");
  }

  return result;
}
```

### 12.3 Cache Invalidation

Cache harus di-invalidate (dihapus) setiap kali ada perubahan data product.

```typescript
// Hapus cache setelah create, update, atau delete product
// Pattern key menggunakan wildcard untuk menghapus semua halaman cache sekaligus
async invalidateProductCache() {
  try {
    const keys = await redis.keys("products:list:*");
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err }, "Redis cache invalidation failed");
  }
}
```

---

## 13. Logging (Pino)

```typescript
// src/lib/logger/index.ts
import pino from "pino";

/**
 * Singleton logger menggunakan Pino.
 * Di development: output yang mudah dibaca (pretty print).
 * Di production: JSON format untuk parsing oleh log aggregator.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

export default logger;
```

### 13.1 Aturan Logging

- Gunakan `logger.info` untuk event normal (login berhasil, order dibuat).
- Gunakan `logger.warn` untuk kondisi tidak ideal tapi dapat ditangani (Redis error, fallback terjadi).
- Gunakan `logger.error` untuk error yang perlu perhatian segera.
- **JANGAN** log password, token JWT, atau data sensitif user dalam bentuk apapun.
- Sertakan context yang berguna dalam log object.

```typescript
// BENAR
logger.info({ userId: user.id }, "User logged in successfully");
logger.error({ error, endpoint: "/api/orders", userId }, "Order creation failed");

// SALAH — jangan pernah lakukan ini
console.log("Login:", user); // bisa expose password hash
logger.info({ user });       // expose seluruh object user termasuk password
```

---

## 14. Unit Testing (Jest)

### 14.1 Yang Harus Ditest

- **Service**: Fokus utama — semua business logic harus ada unit testnya.
- **Repository**: Tidak perlu ditest secara unit — hanya wrapper Prisma.
- **Route Handler**: Tidak perlu unit test — verifikasi via Postman.

### 14.2 Konfigurasi Jest

Pastikan `tsconfig.json` dan Jest dikonfigurasi untuk resolve alias `@/` dengan benar.

```typescript
// __tests__/product.service.test.ts
import { productService } from "@/lib/modules/product/product.service";
import { productRepository } from "@/lib/modules/product/product.repository";
import { AppError } from "@/lib/errors/AppError";

// Mock seluruh modul repository agar tidak perlu koneksi database saat testing
jest.mock("@/lib/modules/product/product.repository");
const mockRepo = productRepository as jest.Mocked<typeof productRepository>;

describe("productService", () => {
  // Reset mock sebelum setiap test agar tidak saling mempengaruhi
  beforeEach(() => jest.clearAllMocks());

  describe("getProductById", () => {
    it("should return product when found", async () => {
      const mockProduct = {
        id: "clx123",
        name: "Test",
        price: 100000 as never,
        stock: 5,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockRepo.findById.mockResolvedValue(mockProduct);

      const result = await productService.getProductById("clx123");
      expect(result).toEqual(mockProduct);
    });

    it("should throw AppError 404 when product not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(productService.getProductById("not-exist")).rejects.toThrow(AppError);
      await expect(productService.getProductById("not-exist")).rejects.toMatchObject({
        statusCode: 404,
        message: "Product not found",
      });
    });
  });

  describe("deleteProduct", () => {
    it("should throw AppError 404 when deleting non-existent product", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(productService.deleteProduct("not-exist")).rejects.toThrow(AppError);
    });

    it("should call softDelete when product exists", async () => {
      mockRepo.findById.mockResolvedValue({ id: "clx123" } as never);
      mockRepo.softDelete.mockResolvedValue({ id: "clx123" } as never);

      await productService.deleteProduct("clx123");
      expect(mockRepo.softDelete).toHaveBeenCalledWith("clx123");
    });
  });
});
```

---

## 15. Environment Variables

### 15.1 Variabel yang Wajib Ada

```bash
# .env.example — template wajib disertakan di repository

# Database PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/solutech_db

# JWT Authentication
JWT_SECRET=ganti_dengan_string_random_min_32_karakter
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development

# Redis (opsional — untuk caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

### 15.2 Validasi Environment Saat Startup

```typescript
// src/lib/config/env.ts

/**
 * Validasi environment variables saat aplikasi startup.
 * Jika variabel wajib tidak ada, aplikasi crash lebih awal dengan pesan yang jelas.
 * Ini lebih baik daripada error misterius di tengah request.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Config] Missing required environment variable: "${key}". ` +
      `Check your .env file and ensure it matches .env.example.`
    );
  }
  return value;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  nodeEnv: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;
```

---

## 16. Konvensi Penamaan

| Item | Konvensi | Contoh |
|---|---|---|
| File TypeScript | `kebab-case.ts` | `product.service.ts`, `app-error.ts` |
| Direktori | `kebab-case` | `lib/modules/product/`, `lib/auth/` |
| Variabel & fungsi | `camelCase` | `productService`, `createProduct`, `userId` |
| Class | `PascalCase` | `AppError` |
| Type & Interface | `PascalCase` | `JwtPayload`, `CreateProductInput` |
| Konstanta module-level | `SCREAMING_SNAKE_CASE` | `JWT_SECRET`, `MAX_LIMIT` |
| Prisma model | `PascalCase` | `Product`, `Order`, `OrderItem` |
| Tabel database (@@map) | `snake_case` | `products`, `order_items` |
| Enum Prisma | `SCREAMING_SNAKE_CASE` | `OrderStatus.PENDING` |
| Route Handler file | selalu `route.ts` | `app/api/products/route.ts` |
| Test file | `*.test.ts` | `product.service.test.ts` |

---

## 17. Git & Commit

### 17.1 Format Conventional Commits

```
<type>(<scope>): <deskripsi singkat dalam bahasa Indonesia atau Inggris>
```

| Type | Kapan digunakan |
|---|---|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `chore` | Setup, konfigurasi, dependency, tooling |
| `refactor` | Refactoring tanpa perubahan fungsional |
| `test` | Menambah atau mengubah test |
| `docs` | Dokumentasi (README, AGENTS.md, komentar) |

Contoh commit yang baik:
```
feat(auth): implement JWT login endpoint
feat(product): add soft delete and pagination
feat(order): create order with database transaction
fix(order): rollback transaction on insufficient stock
chore(prisma): add User, Product, Order, OrderItem models
test(product-service): add unit tests for getProductById
docs(readme): add setup and seeding instructions
```

### 17.2 Aturan Commit

- Commit sesering mungkin — setiap fitur kecil yang selesai layak di-commit.
- Satu commit = satu perubahan logis yang kohesif.
- Jangan commit `.env` (sudah ada di `.gitignore`).
- Jangan commit `node_modules/`, `.next/`, `src/generated/`.

---

## 18. Checklist Sebelum Commit

Verifikasi checklist ini sebelum setiap commit untuk memastikan kualitas kode:

**Security**
- [ ] Semua endpoint yang perlu proteksi sudah memanggil `withAuth`.
- [ ] Tidak ada password atau token yang dikembalikan dalam response API.
- [ ] Tidak ada hardcoded secret, URL database, atau credential — semua di `.env`.
- [ ] `userId` untuk order diambil dari JWT, bukan dari request body user.

**Validasi & Error Handling**
- [ ] Semua input dari request sudah divalidasi dengan Zod `safeParse`.
- [ ] Semua Route Handler memiliki `try/catch` dengan pembedaan `AppError` vs error umum.
- [ ] HTTP status code yang dikembalikan sesuai tabel standar di bagian 8.3.

**Database & Prisma**
- [ ] Semua query yang membaca product menyertakan filter `deletedAt: null`.
- [ ] Proses pembuatan order menggunakan `prisma.$transaction`.
- [ ] Tidak ada query Prisma langsung di Route Handler.

**Kode Bersih**
- [ ] Tidak ada `console.log` — diganti dengan `logger`.
- [ ] Tidak ada tipe `any` yang tidak perlu.
- [ ] Semua `params` di Route Handler sudah di-`await` (Next.js 15+ breaking change).
- [ ] Response menggunakan `apiSuccess` atau `apiError` — format konsisten.

**TypeScript**
- [ ] Tidak ada TypeScript error (`npm run lint`).
- [ ] Semua exported type berasal dari Zod infer atau definisi eksplisit.

**Enkripsi Payload (jika `ENCRYPTION_ENABLED=true`)**
- [ ] Setiap request melewati `decryptRequestMiddleware` sebelum masuk ke Route Handler.
- [ ] Setiap response melewati `encryptResponseMiddleware`.
- [ ] `X-Client-Key` header diverifikasi sebelum proses dekripsi.
- [ ] `client_public_key` yang digunakan untuk enkripsi response diambil dari database, bukan hardcode.
- [ ] Di environment `local` / `NODE_ENV=development` tanpa `ENCRYPTION_ENABLED=true`, enkripsi di-skip.

---

## 19. API Payload Encryption

> Fitur ini adalah **security enhancement production-grade**.
> Aktif hanya di environment `dev`, `uat`, dan `prod` via env flag `ENCRYPTION_ENABLED=true`.
> Di `local` development (`ENCRYPTION_ENABLED` tidak di-set atau `false`), seluruh middleware enkripsi di-skip.

### 19.1 Kapan Enkripsi Diaktifkan

```bash
# .env.example — tambahkan variabel ini

# Enkripsi payload — aktifkan di dev/uat/prod
# Biarkan kosong atau false untuk local development
ENCRYPTION_ENABLED=false

# RSA Private Key server (PEM format, base64-encoded)
SERVER_PRIVATE_KEY_BASE64=

# RSA Public Key server yang dibagikan ke client (base64-encoded)
SERVER_PUBLIC_KEY_BASE64=
```

### 19.2 Konsep Arsitektur — Hybrid Encryption

RSA murni lambat untuk payload besar. Gunakan **Hybrid Encryption**:

```
┌─────────────────────────────────────────────────────────┐
│                    ALUR REQUEST                         │
│                                                         │
│  Client                          Server                 │
│    │                               │                    │
│    │  1. Generate AES-256-GCM      │                    │
│    │     session key (ephemeral)   │                    │
│    │                               │                    │
│    │  2. Encrypt session key       │                    │
│    │     dgn Server RSA Public Key │                    │
│    │                               │                    │
│    │  3. Encrypt body JSON         │                    │
│    │     dgn AES session key       │                    │
│    │                               │                    │
│    │──── X-Client-Key: <key> ─────>│                    │
│    │──── X-Encrypted-Key: <RSA> ──>│                    │
│    │──── Body: <AES ciphertext> ──>│                    │
│    │                               │                    │
│    │               4. Verify X-Client-Key di DB         │
│    │               5. Decrypt X-Encrypted-Key           │
│    │                  dgn Server RSA Private Key        │
│    │               6. Decrypt body dgn AES key          │
│    │               7. Proses bisnis normal              │
│    │               8. Encrypt response dgn              │
│    │                  Client RSA Public Key             │
│    │                               │                    │
│    │<─── Body: <encrypted response>│                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 19.3 Schema Prisma — Tabel Client Keys

Tambahkan model `ApiClient` untuk menyimpan client pubkey yang terdaftar:

```prisma
// Tambahkan ke prisma/schema.prisma

model ApiClient {
  id          String    @id @default(cuid())
  name        String                          // Nama aplikasi client
  clientKey   String    @unique               // X-Client-Key yang dikirim di header
  // RSA Public Key client dalam format PEM, digunakan server untuk encrypt response
  // JANGAN simpan private key client di sini
  publicKey   String    @db.Text
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  revokedAt   DateTime?                       // Revoke tanpa hapus record

  @@map("api_clients")
}
```

### 19.4 Struktur Direktori Tambahan

```
src/lib/
├── crypto/
│   ├── index.ts          # Re-export semua fungsi crypto
│   ├── rsa.ts            # RSA-OAEP encrypt/decrypt (untuk key exchange)
│   ├── aes.ts            # AES-256-GCM encrypt/decrypt (untuk payload)
│   └── middleware.ts     # decryptRequest & encryptResponse middleware
└── modules/
    └── api-client/
        └── api-client.repository.ts  # Query tabel api_clients
```

### 19.5 Implementasi Crypto Utilities

```typescript
// src/lib/crypto/rsa.ts
import crypto from "node:crypto";

/**
 * Decrypt data yang di-encrypt client menggunakan RSA-OAEP + SHA-256.
 * Digunakan untuk mendekripsi AES session key yang dikirim client.
 *
 * @param encryptedBase64 - Data terenkripsi dalam format Base64
 * @param privateKeyPem   - Server RSA Private Key dalam format PEM
 */
export function rsaDecrypt(encryptedBase64: string, privateKeyPem: string): Buffer {
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  return crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedBuffer
  );
}

/**
 * Encrypt data menggunakan RSA-OAEP + SHA-256.
 * Digunakan untuk mengenkripsi AES session key response dengan Client Public Key.
 *
 * @param data           - Data yang akan dienkripsi (Buffer atau string)
 * @param publicKeyPem   - Client RSA Public Key dalam format PEM
 */
export function rsaEncrypt(data: Buffer | string, publicKeyPem: string): string {
  const buffer = typeof data === "string" ? Buffer.from(data) : data;
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  );
  return encrypted.toString("base64");
}
```

```typescript
// src/lib/crypto/aes.ts
import crypto from "node:crypto";

const AES_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;     // 96 bit — standar untuk GCM
const TAG_LENGTH = 16;    // 128 bit auth tag

/**
 * Hasil enkripsi AES-256-GCM.
 * IV dan Auth Tag harus dikirim bersama ciphertext untuk dekripsi.
 */
export interface AesEncryptResult {
  ciphertext: string; // Base64
  iv: string;         // Base64
  authTag: string;    // Base64
}

/**
 * Encrypt data menggunakan AES-256-GCM.
 * Menggunakan key 256-bit dan IV acak untuk setiap enkripsi.
 *
 * @param plaintext - String atau JSON string yang akan dienkripsi
 * @param key       - AES key dalam format Buffer (32 bytes / 256 bits)
 */
export function aesEncrypt(plaintext: string, key: Buffer): AesEncryptResult {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypt data yang di-encrypt menggunakan AES-256-GCM.
 * Akan melempar error jika auth tag tidak valid (data tampering terdeteksi).
 *
 * @param ciphertext - Data terenkripsi dalam Base64
 * @param key        - AES key dalam Buffer (32 bytes)
 * @param iv         - IV yang digunakan saat enkripsi (Base64)
 * @param authTag    - Authentication tag untuk verifikasi integritas (Base64)
 */
export function aesDecrypt(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): string {
  const decipher = crypto.createDecipheriv(
    AES_ALGORITHM,
    key,
    Buffer.from(iv, "base64"),
    { authTagLength: TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(), // Akan throw jika auth tag tidak valid
  ]);

  return decrypted.toString("utf8");
}
```

### 19.6 Middleware Enkripsi/Dekripsi

```typescript
// src/lib/crypto/middleware.ts
import { type NextRequest } from "next/server";
import { rsaDecrypt, rsaEncrypt } from "./rsa";
import { aesDecrypt, aesEncrypt } from "./aes";
import { apiError } from "@/lib/response/api";
import { apiClientRepository } from "@/lib/modules/api-client/api-client.repository";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

/**
 * Cek apakah enkripsi aktif berdasarkan environment.
 * Enkripsi HANYA aktif jika ENCRYPTION_ENABLED=true secara eksplisit.
 * Di local development (env tidak di-set), selalu false.
 */
export function isEncryptionEnabled(): boolean {
  return process.env.ENCRYPTION_ENABLED === "true";
}

/**
 * Format request body terenkripsi yang dikirim oleh client.
 * Client wajib mengirim semua field ini jika enkripsi aktif.
 */
interface EncryptedRequestBody {
  encryptedKey: string;  // AES session key yang di-encrypt dengan Server RSA Public Key (Base64)
  ciphertext: string;    // Payload JSON yang di-encrypt dengan AES session key (Base64)
  iv: string;            // IV yang digunakan untuk AES (Base64)
  authTag: string;       // AES-GCM authentication tag (Base64)
}

/**
 * Dekripsi body request yang dikirim client.
 *
 * Alur:
 * 1. Verifikasi X-Client-Key header — pastikan client terdaftar dan aktif
 * 2. Ambil client public key dari database (untuk enkripsi response nanti)
 * 3. Decrypt AES session key menggunakan Server RSA Private Key
 * 4. Decrypt body payload menggunakan AES session key
 * 5. Return plaintext JSON dan client public key
 *
 * Jika ENCRYPTION_ENABLED=false, langsung kembalikan body mentah.
 */
export async function decryptRequest(request: NextRequest): Promise<{
  body: unknown;
  clientPublicKey: string | null;
}> {
  // Skip enkripsi di local development
  if (!isEncryptionEnabled()) {
    const body = request.headers.get("content-length") !== "0"
      ? await request.json().catch(() => null)
      : null;
    return { body, clientPublicKey: null };
  }

  // 1. Verifikasi X-Client-Key header
  const clientKey = request.headers.get("X-Client-Key");
  if (!clientKey) {
    throw new AppError("X-Client-Key header is required", 401);
  }

  // 2. Cari client di database
  const apiClient = await apiClientRepository.findByClientKey(clientKey);
  if (!apiClient || !apiClient.isActive || apiClient.revokedAt) {
    logger.warn({ clientKey }, "Unrecognized or revoked X-Client-Key");
    throw new AppError("Invalid or revoked client key", 401);
  }

  // 3. Parse encrypted body
  let encryptedBody: EncryptedRequestBody;
  try {
    encryptedBody = await request.json();
  } catch {
    throw new AppError("Invalid encrypted request body", 400);
  }

  const { encryptedKey, ciphertext, iv, authTag } = encryptedBody;
  if (!encryptedKey || !ciphertext || !iv || !authTag) {
    throw new AppError(
      "Encrypted body must contain: encryptedKey, ciphertext, iv, authTag",
      400
    );
  }

  // 4. Decrypt AES session key menggunakan Server RSA Private Key
  const serverPrivateKeyPem = Buffer.from(
    process.env.SERVER_PRIVATE_KEY_BASE64!,
    "base64"
  ).toString("utf8");

  let aesKey: Buffer;
  try {
    aesKey = rsaDecrypt(encryptedKey, serverPrivateKeyPem);
  } catch (err) {
    logger.warn({ err, clientKey }, "Failed to decrypt AES session key");
    throw new AppError("Failed to decrypt session key", 400);
  }

  // 5. Decrypt payload dengan AES-256-GCM
  let plaintextJson: string;
  try {
    plaintextJson = aesDecrypt(ciphertext, aesKey, iv, authTag);
  } catch (err) {
    // Bisa berarti data tampering atau key yang salah
    logger.warn({ err, clientKey }, "AES decryption failed — possible tampering");
    throw new AppError("Payload decryption failed", 400);
  }

  return {
    body: JSON.parse(plaintextJson),
    clientPublicKey: apiClient.publicKey,
  };
}

/**
 * Enkripsi response sebelum dikembalikan ke client.
 *
 * Alur:
 * 1. Generate AES session key baru (ephemeral — berbeda setiap response)
 * 2. Encrypt response JSON dengan AES session key
 * 3. Encrypt AES session key dengan Client RSA Public Key
 * 4. Return Response dengan format terenkripsi
 *
 * Jika ENCRYPTION_ENABLED=false atau clientPublicKey null,
 * kembalikan Response JSON biasa.
 */
export function encryptResponse(
  data: unknown,
  clientPublicKey: string | null,
  status: number = 200
): Response {
  // Skip enkripsi jika tidak aktif atau tidak ada client public key
  if (!isEncryptionEnabled() || !clientPublicKey) {
    return Response.json(data, { status });
  }

  // 1. Generate AES ephemeral session key untuk response ini
  const aesKey = crypto.getRandomValues(new Uint8Array(32)); // 256 bit
  const aesKeyBuffer = Buffer.from(aesKey);

  // 2. Encrypt response JSON dengan AES-256-GCM
  const { ciphertext, iv, authTag } = aesEncrypt(
    JSON.stringify(data),
    aesKeyBuffer
  );

  // 3. Encrypt AES session key dengan Client RSA Public Key
  const encryptedKey = rsaEncrypt(aesKeyBuffer, clientPublicKey);

  // 4. Return response terenkripsi
  return Response.json(
    { encryptedKey, ciphertext, iv, authTag },
    { status }
  );
}
```

### 19.7 Repository ApiClient

```typescript
// src/lib/modules/api-client/api-client.repository.ts
import { prisma } from "@/lib/db/prisma";

export const apiClientRepository = {
  /**
   * Cari API client berdasarkan client key yang dikirim di header.
   * Digunakan oleh middleware untuk verifikasi identitas client.
   */
  async findByClientKey(clientKey: string) {
    return prisma.apiClient.findUnique({
      where: { clientKey },
      select: {
        id: true,
        name: true,
        clientKey: true,
        publicKey: true,   // RSA Public Key untuk encrypt response
        isActive: true,
        revokedAt: true,
      },
    });
  },
};
```

### 19.8 Cara Pakai di Route Handler

Route Handler yang mendukung enkripsi menggunakan `decryptRequest` dan `encryptResponse`:

```typescript
// src/app/api/products/route.ts — dengan dukungan enkripsi
import { type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { apiError } from "@/lib/response/api";
import { decryptRequest, encryptResponse, isEncryptionEnabled } from "@/lib/crypto/middleware";
import { productService } from "@/lib/modules/product/product.service";
import { createProductSchema } from "@/lib/modules/product/product.schema";
import { AppError } from "@/lib/errors/AppError";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request);
  if (!authResult.success) return authResult.response;

  try {
    // Satu baris ini menangani dua mode: enkripsi aktif atau tidak
    // Jika ENCRYPTION_ENABLED=true → decrypt payload + verifikasi X-Client-Key
    // Jika ENCRYPTION_ENABLED=false → baca JSON biasa
    const { body, clientPublicKey } = await decryptRequest(request);

    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const product = await productService.createProduct(parsed.data);

    // Satu baris ini menangani dua mode:
    // Jika ENCRYPTION_ENABLED=true → encrypt response dengan client public key
    // Jika ENCRYPTION_ENABLED=false → return JSON biasa
    return encryptResponse(
      { success: true, message: "Product created", data: product },
      clientPublicKey,
      201
    );
  } catch (error) {
    if (error instanceof AppError) return apiError(error.message, error.statusCode);
    logger.error({ error }, "POST /api/products failed");
    return apiError("Internal server error", 500);
  }
}
```

### 19.9 Format Payload Terenkripsi (Request & Response)

**Request dari client ke server** (saat `ENCRYPTION_ENABLED=true`):
```json
// Header:
// X-Client-Key: <client_key_terdaftar>
// Content-Type: application/json

// Body:
{
  "encryptedKey": "<AES session key dienkripsi dengan Server RSA Public Key, Base64>",
  "ciphertext":   "<JSON payload dienkripsi dengan AES key, Base64>",
  "iv":           "<Initialization Vector AES, Base64>",
  "authTag":      "<AES-GCM authentication tag, Base64>"
}
```

**Response dari server ke client** (saat `ENCRYPTION_ENABLED=true`):
```json
{
  "encryptedKey": "<AES session key dienkripsi dengan Client RSA Public Key, Base64>",
  "ciphertext":   "<Response JSON dienkripsi dengan AES key, Base64>",
  "iv":           "<Initialization Vector AES, Base64>",
  "authTag":      "<AES-GCM authentication tag, Base64>"
}
```

**Request/Response saat `ENCRYPTION_ENABLED=false` (local):**
```json
// Request body — JSON biasa, tidak perlu enkripsi
{ "name": "Laptop", "price": 15000000, "stock": 10 }

// Response — JSON biasa
{ "success": true, "message": "Product created", "data": { ... } }
```

### 19.10 Aturan Wajib Enkripsi

- **DILARANG** menggunakan algoritma enkripsi selain RSA-OAEP (SHA-256) + AES-256-GCM.
- **DILARANG** meng-hardcode private key — selalu dari environment variable.
- **DILARANG** menyimpan AES session key ke database atau log — key harus ephemeral (sekali pakai).
- **DILARANG** menggunakan RSA murni untuk encrypt payload (payload bisa besar, RSA terbatas ~190 bytes).
- **WAJIB** generate AES IV baru untuk setiap enkripsi — jangan reuse IV.
- **WAJIB** verifikasi `X-Client-Key` sebelum melakukan dekripsi apapun.
- **WAJIB** gunakan `revokedAt` untuk menonaktifkan client — jangan hapus record.
- **JANGAN** log AES session key atau RSA private key dalam kondisi apapun.
- **JANGAN** kembalikan detail error enkripsi ke client — hanya pesan generik.

### 19.11 Generate RSA Key Pair (Satu Kali Setup)

Jalankan command ini untuk generate key pair server:

```bash
# Generate RSA private key 2048-bit
openssl genrsa -out server_private.pem 2048

# Extract public key dari private key
openssl rsa -in server_private.pem -pubout -out server_public.pem

# Encode ke Base64 untuk disimpan di environment variable
# Windows PowerShell:
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("server_private.pem"))
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("server_public.pem"))

# Linux/Mac:
base64 -w 0 server_private.pem
base64 -w 0 server_public.pem

# HAPUS file .pem setelah disimpan ke env — jangan commit ke git!
Remove-Item server_private.pem, server_public.pem
```

---

*Dokumen ini wajib dipatuhi oleh seluruh agent yang bekerja di project ini.*
*Terakhir diperbarui: 2026-08-07*
