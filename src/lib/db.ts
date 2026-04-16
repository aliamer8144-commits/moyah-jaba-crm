import { PrismaClient } from '@prisma/client'

// Single instance for the entire application lifecycle
// This prevents connection exhaustion on serverless (Vercel)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL!,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, reuse the same instance across hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown handler for production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
