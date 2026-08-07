import bcrypt from "bcrypt";
import type { PrismaClient, Role } from "../../../src/generated/prisma";
import { userData } from "./user.data";

/** Jumlah salt rounds untuk bcrypt. 10 adalah keseimbangan baik antara keamanan dan performa. */
const BCRYPT_SALT_ROUNDS = 10;

export interface SeededUserResult {
  id: string;
  email: string;
  name: string;
  role: { name: string };
}

/**
 * Seed tabel `users`.
 *
 * @param prisma     - Instance PrismaClient yang aktif
 * @param seededRoles - Array role yang sudah di-seed (hasil dari seedRoles)
 * @returns Array of seeded users (tanpa field password untuk keamanan)
 */
export async function seedUsers(
  prisma: PrismaClient,
  seededRoles: Pick<Role, "id" | "name">[]
) {
  console.log("  → Seeding users...");

  const roleMap = new Map(seededRoles.map((r) => [r.name, r.id]));

  const users: SeededUserResult[] = await Promise.all(
    userData.map(async (user) => {
      const roleId = roleMap.get(user.roleName);
      if (!roleId) {
        throw new Error(
          `Role "${user.roleName}" not found. ` +
          `Pastikan seedRoles() sudah dijalankan sebelum seedUsers().`
        );
      }

      const hashedPassword = await bcrypt.hash(user.plainPassword, BCRYPT_SALT_ROUNDS);

      return prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          roleId,
        },
        create: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          roleId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: { select: { name: true } },
        },
      });
    })
  );

  console.log(
    `  ✓ ${users.length} users seeded: ${users.map((u: SeededUserResult) => `${u.email} (${u.role.name})`).join(", ")}`
  );
  return users;
}
