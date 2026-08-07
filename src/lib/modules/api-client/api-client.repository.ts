import { prisma } from "@/lib/db/prisma";

export const apiClientRepository = {
  /**
   * Cari API client berdasarkan client key yang dikirim di header X-Client-Key.
   * Digunakan oleh middleware crypto untuk memverifikasi identitas client dan mengambil RSA Public Key.
   *
   * @param clientKey - Identifier unik client
   */
  async findByClientKey(clientKey: string) {
    return prisma.apiClient.findUnique({
      where: { clientKey },
      select: {
        id: true,
        name: true,
        clientKey: true,
        publicKey: true,
        isActive: true,
        revokedAt: true,
      },
    });
  },
};
