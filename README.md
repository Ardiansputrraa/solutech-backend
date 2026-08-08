# Solutech Backend Service

Aplikasi RESTful API Backend E-Commerce berkinerja tinggi yang dibangun menggunakan **Next.js 15+ (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, dan **Redis**. Service ini mendukung **Hybrid Cryptography (RSA-256 + AES-256-GCM)** untuk enkripsi payload sensitif, **Multi-Schema Database**, **Atomic Database Transactions** untuk pemesanan produk, dan **Non-blocking Redis SCAN Caching**.

---

## Fitur Utama

- **Modul Autentikasi & RBAC**: Login berbasis JWT untuk role `ADMIN` dan `USER`.
- **End-to-End Hybrid Payload Encryption**: Enkripsi dan dekripsi payload dua arah menggunakan RSA-256 (Key Exchange) & AES-256-GCM (Payload Ciphertext) via header `X-Client-Key`.
- **Modul Manajemen Produk**: CRUD produk lengkap dengan fitur *Soft Delete* (`isDeleted`), pencarian nama, paginasi, dan proteksi role Admin.
- **Redis Catalog Caching**: Optimasi pencarian katalog produk (penurunan waktu respon dari 327ms menjadi 36ms) menggunakan *non-blocking SCAN stream* dan *graceful fallback* jika server Redis offline.
- **Modul Transaksi Order**: Pembuatan order multi-item dalam satu **Database Transaction atomik** (`prisma.$transaction`) untuk pemotongan stok otomatis (`decrement`), pencegahan *overselling*, snapshot harga historis, serta penyaringan daftar order sesuai hak akses kepemilikan user.
- **Master Postman Collection**: Dokumentasi API terstruktur (v2.1.0) dengan contoh respon status code lengkap (`200`, `201`, `400`, `401`, `403`, `404`, `500`).
- **Automated Testing**: 100% Lulus Suite Unit Test Jest (35/35 unit test).

---

## Teknologi & Stack Utama

- **Framework**: Next.js 15+ (App Router & Route Handlers)
- **Language**: TypeScript
- **Database**: PostgreSQL 16+ (Multi-Schema: `master`, `product`, `transaction`)
- **ORM**: Prisma ORM 6+
- **Caching**: Redis (ioredis client with SCAN Stream)
- **Validation**: Zod
- **Security**: Hybrid RSA-256 + AES-256-GCM, jsonwebtoken, bcryptjs
- **Testing**: Jest

---

## Cara Setup dan Menjalankan di Local

### 1. Prasyarat System
Pastikan perangkat Anda telah terpasang:
- **Node.js**: v20.x atau lebih baru
- **PostgreSQL**: v16.x atau lebih baru
- **Redis**: v7.x atau lebih baru (atau jalankan via Docker Compose)

---

### Setup Infrastruktur Database & Redis via Docker Compose (Opsional)

Jika Anda tidak menginstall PostgreSQL dan Redis secara native di sistem lokal, gunakan file `docker-compose.yml` yang telah disediakan untuk menjalankan keduanya sekaligus:

```bash
# Jalankan container PostgreSQL (Port 5433) & Redis (Port 6379)
docker-compose up -d

# Periksa status container
docker-compose ps

# Hentikan container (jika sudah selesai)
docker-compose down
```

---

### 2. Instalasi Dependencies

Jalankan perintah di bawah ini untuk menginstal seluruh dependensi modul proyek:

```bash
npm install
```

---

### 3. Konfigurasi Environment Variable (`.env`)

Buat file `.env` di direktori root aplikasi berdasarkan templat di bawah ini:

```env
# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database_name>"

# JWT Authentication Configuration
JWT_SECRET="<your_jwt_secret_key>"
JWT_EXPIRES_IN="1d"

# Server Environment Configuration
NODE_ENV="development"

# Redis Cache Configuration
REDIS_URL="redis://<host>:<port>"

# Hybrid Cryptography Configuration (RSA Keys)
ENCRYPTION_ENABLED="false"
SERVER_PRIVATE_KEY_BASE64="<your_server_private_key_base64_format>"
```

---

### 4. Setup Database, Prisma Generate, & Migrasi

Jalankan perintah generate Prisma Client dan migrasi database PostgreSQL secara berurutan:

```bash
# Generate Prisma Client (TypeScript Types)
npx prisma generate

# Jalankan migrasi Prisma Dev
npx prisma migrate dev
```

#### Script DDL SQL Manual (Opsional — Tidak Wajib)

> **Catatan:** Dengan menjalankan perintah `npx prisma migrate dev` pada langkah di atas, seluruh skema dan tabel database PostgreSQL **sudah dibuat secara otomatis oleh Prisma**. Anda **TIDAK PERLU** membuat tabel secara manual.
> Script DDL SQL di bawah ini disediakan hanya sebagai referensi opsional jika Anda ingin melihat DDL atau mengeksekusinya secara manual di PostgreSQL Client (DBeaver / pgAdmin / psql):

```sql
-- 1. Buat Multi Schema
CREATE SCHEMA IF NOT EXISTS "master";
CREATE SCHEMA IF NOT EXISTS "product";
CREATE SCHEMA IF NOT EXISTS "transaction";

-- 2. Schema Master: Enum, Roles, Users, API Clients
CREATE TYPE "master"."RoleName" AS ENUM ('ADMIN', 'USER');

CREATE TABLE "master"."roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" "master"."RoleName" NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "master"."users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL REFERENCES "master"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "master"."api_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL UNIQUE,
    "publicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 3. Schema Product: Products
CREATE TABLE "product"."products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 4. Schema Transaction: Enum, Orders, Order Items
CREATE TYPE "transaction"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "transaction"."orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "master"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "status" "transaction"."OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "transaction"."order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "transaction"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "product"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL
);
```

---

### 5. Perintah Seed Database Prisma

Isi data awal database (Akun Admin, User Demo, API Client Key, dan Katalog Produk):

```bash
npx prisma db seed
```

> **Akun Default Setelah Seeding:**
> - Admin: `admin@solutech.id` / Password: `Admin@123`
> - User Demo: `user@solutech.id` / Password: `User@123`
> - Client Key: `CLIENT_SOLUTECH_DEV_01`

---

### 6. Menjalankan Server Aplikasi

```bash
# Jalankan mode development
npm run dev

# Jalankan build produksi & start server
npm run build
npm start
```
Aplikasi API akan berjalan pada `http://localhost:3000/api/...`.

---

### 7. Menjalankan Automated Unit Tests

```bash
npm test
```

---

## Keputusan Teknis & Asumsi

1. **PostgreSQL Multi-Schema Architecture**:
   - Memisahkan tabel ke dalam 3 schema terisolasi (`master`, `product`, `transaction`) untuk mempermudah migrasi microservices di masa mendatang.
2. **Hybrid Cryptography (RSA-256 + AES-256-GCM)**:
   - Header `X-Client-Key` mengaktifkan mode enkripsi dua arah. Kunci simetris AES dienkripsi dengan RSA Public Key client, sedangkan data dienkripsi dengan AES-256-GCM (Auth Tag & IV) untuk keamanan maksimal tingkat perbankan.
3. **Atomic Transactions (`prisma.$transaction`)**:
   - Pembuatan transaksi order dilakukan secara atomik di PostgreSQL. Pemotongan stok (`decrement`) dan validasi ketersediaan barang dieksekusi dalam satu siklus transaksi. Jika stok tidak mencukupi di salah satu item, seluruh transaksi di-rollback tanpa mengubah stok database.
4. **Redis SCAN Stream & Graceful Fallback**:
   - Menghindari pemblokiran thread Redis (`KEYS *`) dengan memanfaatkan `scanStream`. Jika server Redis mati/offline, aplikasi secara otomatis mencatat peringatan di log dan tetap melayani request via database utama tanpa melempar HTTP 500 error.
5. **RBAC Ownership Guard di Modul Order**:
   - Pengambilan daftar order (`GET /api/orders`) secara otomatis menyaring `userId` untuk akun berkategori `USER` (hanya melihat transaksi sendiri). Sedangkan akun `ADMIN` dapat memantau seluruh transaksi toko.
6. **Snapshot Harga Historis (`OrderItem.unitPrice`)**:
   - Harga barang disimpan sebagai snapshot saat order dibuat agar perubahan harga produk di kemudian hari tidak merusak integritas laporan keuangan historis.

---

## Daftar Fitur (Selesai dan Belum)

### Fitur yang Selesai (100%)
- **Autentikasi**: Endpoint Login dengan JWT token & auto-capture di Postman.
- **Enkripsi/Dekripsi Hybrid Payload**: Middleware enkripsi RSA-256 & AES-256-GCM via `X-Client-Key`.
- **Manajemen Produk**: CRUD produk, soft delete (`isDeleted`), paginasi, pencarian nama, & proteksi hak akses Admin.
- **Redis Caching Katalog**: Redis cache TTL 300s, non-blocking SCAN stream, & auto-invalidation saat ada pembaruan produk/order.
- **Transaksi Order Atomik**: Transaksi multi-item, pemotongan stok otomatis (`decrement`), snapshot unitPrice, status order, & penyaringan kepemilikan user.
- **Master Postman Collection**: v2.1.0 Collection lengkap dengan seluruh contoh respon resmi per status code.
- **Automated Testing Suite**: 35 unit test Jest lulus 100%.

### Potential Enhancements (Belum Diterapkan / Future Work)
- Seluruh soal technical test telah diselesaikan

---

## Estimasi Waktu Pengerjaan

| Modul / Komponen | Deskripsi Pekerjaan | Estimasi Waktu |
| :--- | :--- | :---: |
| **Modul 1: Architecture & DB Setup** | Inisialisasi Next.js, Docker Compose, Prisma ORM, Multi-schema PostgreSQL DDL, & Seeder | 1 Jam |
| **Modul 2: Auth & Security Middleware** | Autentikasi JWT, Role Permission, & Hybrid RSA+AES Cryptography Middleware | 2 Jam |
| **Modul 3: Product & Redis Caching** | CRUD Produk, Soft Delete, Pagination, Redis SCAN Stream Caching & Invalidation | 1 Jam |
| **Modul 4: Order Transaction Module** | Atomic DB Transaction (`prisma.$transaction`), Stock Decrement, RBAC Ownership Filtering | 2 Jam |
| **Modul 5: Testing & Documentation** | Jest Unit Tests (35 tests), Master Postman Collection, & Technical README | 1 Jam |
| **TOTAL WAKTU PENGERJAAN** | | **7 Jam** |
