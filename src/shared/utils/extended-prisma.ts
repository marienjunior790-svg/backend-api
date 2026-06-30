import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Accès aux modèles Prisma pas encore générés côté client (pré-migration). */
export function extendedPrisma(prisma: PrismaService) {
  return prisma as PrismaService & Record<string, {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args?: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    count: (args?: unknown) => Promise<number>;
  }>;
}
