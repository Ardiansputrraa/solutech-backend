import type { PrismaClient } from "../../../src/generated/prisma";
import { DEV_CLIENT_KEY, DEV_CLIENT_PUBLIC_KEY } from "./client.data";

/**
 * Seed tabel `api_clients` untuk testing enkripsi payload di environment dev/uat/prod.
 */
export async function seedApiClients(prisma: PrismaClient) {
  console.log("  → Seeding api_clients...");

  const client = await prisma.apiClient.upsert({
    where: { clientKey: DEV_CLIENT_KEY },
    update: {
      name: "Solutech Mobile & Web Dev Client",
      publicKey: DEV_CLIENT_PUBLIC_KEY,
      isActive: true,
      revokedAt: null,
    },
    create: {
      name: "Solutech Mobile & Web Dev Client",
      clientKey: DEV_CLIENT_KEY,
      publicKey: DEV_CLIENT_PUBLIC_KEY,
      isActive: true,
    },
  });

  console.log(`  ✓ ApiClient seeded: ${client.name} (Key: ${client.clientKey})`);
  return client;
}
