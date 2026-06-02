import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { mkdirSync } from 'fs'
import path from 'path'

function defaultDatabaseUrl() {
  const databasePath = path.join(process.cwd(), 'data', 'data.db')
  mkdirSync(path.dirname(databasePath), { recursive: true })
  return `file:${databasePath.replace(/\\/g, '/')}`
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? defaultDatabaseUrl()
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
