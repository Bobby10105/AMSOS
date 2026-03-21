import { PrismaClient } from '@prisma/client';

// Trigger reload for new schema: 2026-03-20
const globalForPrisma = global as unknown as { prisma: PrismaClient };


export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
