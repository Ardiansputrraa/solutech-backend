import { prisma } from "@/lib/db/prisma";

export const authRepository = {
  /**
   * Cari user berdasarkan email beserta data role.
   * Digunakan oleh auth.service.ts untuk memverifikasi kredensial login.
   *
   * @param email - Email user yang dicari
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  },
};
