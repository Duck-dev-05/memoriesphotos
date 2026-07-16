import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const connectionString = process.env.DATABASE_URL || 'file:./dev.db';

if (process.env.NODE_ENV === 'production' && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db'))) {
  console.error("CRITICAL ERROR: DATABASE_URL is not set in Vercel Environment Variables!");
}

const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;

const client = createClient({
  url: connectionString,
  authToken,
});

const adapter = new PrismaLibSql(client as any);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter, log: ['query'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
