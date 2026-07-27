import 'dotenv/config'

import { createPrisma, type DbClient } from './db'
import { loadEnv, type AppEnv } from './env'

export type BackendRuntime = {
  env: AppEnv
  prisma: DbClient
  close: () => Promise<void>
}

export function createBackendRuntime(
  source: Record<string, string | undefined> = (typeof Bun !== 'undefined' ? Bun.env : process.env as Record<string, string | undefined>),
): BackendRuntime {
  const env = loadEnv(source)
  const prisma = createPrisma(env.DATABASE_URL)
  let closed = false

  return {
    env,
    prisma,
    close: async () => {
      if (closed) return
      closed = true
      await prisma.$disconnect()
    },
  }
}
