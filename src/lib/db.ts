import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Read DATABASE_URL from .env file directly.
 * This bypasses shell environment variables that might override .env values.
 * On Vercel, env vars are set correctly through the dashboard.
 */
function getDatabaseUrl(): string {
  // In production (Vercel), use process.env directly
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL!
  }

  // In development, read from .env file to override stale shell env vars
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    const match = envContent.match(/^DATABASE_URL=(.+)$/m)
    if (match?.[1]) {
      return match[1].trim()
    }
  } catch {
    // Fall through to process.env
  }

  return process.env.DATABASE_URL!
}

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
        url: getDatabaseUrl(),
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
