import { PrismaClient } from '@prisma/client'

// Singleton pattern — prevents multiple client instances when nodemon hot-reloads.
// In production only one instance is ever created.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
