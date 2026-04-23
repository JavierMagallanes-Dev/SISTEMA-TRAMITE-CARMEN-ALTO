// src/config/prisma.ts
// Singleton de PrismaClient.
// En desarrollo, ts-node-dev recarga módulos en cada cambio.
// Sin el patrón singleton, se crearían múltiples conexiones a la BD
// y Supabase lanzaría errores de "too many connections".

import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ['error', 'warn'] : ['error'],
  });

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}

export default prisma;