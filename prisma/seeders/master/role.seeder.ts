import type { PrismaClient, Role } from "../../../src/generated/prisma";
import { roleData } from "./role.data";

/**
 * Seed tabel `roles`.
 *
 * Menggunakan `upsert` berdasarkan `name` (unique) sehingga idempotent.
 *
 * @param prisma - Instance PrismaClient yang aktif
 * @returns Array of seeded roles
 */
export async function seedRoles(prisma: PrismaClient) {
  console.log("  → Seeding roles...");

  const roles: Role[] = await Promise.all(
    roleData.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: {
          name: role.name,
          description: role.description,
        },
      })
    )
  );

  console.log(`  ✓ ${roles.length} roles seeded: ${roles.map((r: Role) => r.name).join(", ")}`);
  return roles;
}
