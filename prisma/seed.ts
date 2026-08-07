/**
 * Entry point utama untuk database seeding.
 *
 * Cara menjalankan:
 *   npx prisma db seed
 *
 * URUTAN SEEDING:
 *   1. Master: Roles   → harus ada sebelum User
 *   2. Master: Users   → membutuhkan roleId dari Roles
 *   3. Product: Products
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { seedRoles } from "./seeders/master/role.seeder";
import { seedUsers } from "./seeders/master/user.seeder";
import { seedApiClients } from "./seeders/master/client.seeder";
import { seedProducts } from "./seeders/product/product.seeder";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║       SOLUTECH DATABASE SEEDING        ║");
  console.log("╚════════════════════════════════════════╝\n");

  // ── 1. MASTER SCHEMA ─────────────────────────────────────────────
  console.log("📋 [1/2] Master Schema — Roles, Users & ApiClients");
  const seededRoles = await seedRoles(prisma);
  await seedUsers(prisma, seededRoles);
  await seedApiClients(prisma);

  // ── 2. PRODUCT SCHEMA ─────────────────────────────────────────────
  console.log("\n📦 [2/2] Product Schema — Products");
  await seedProducts(prisma);

  // ── SELESAI ───────────────────────────────────────────────────────
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║         SEEDING SELESAI ✅              ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("");
  console.log("Credentials login (development only):");
  console.log("  Admin: admin@solutech.id / Admin@123");
  console.log("  User : user@solutech.id  / User@123");
  console.log("");
}

main()
  .catch((error) => {
    console.error("\n❌ Seeding gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
