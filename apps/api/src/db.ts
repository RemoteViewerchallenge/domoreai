import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './db/schema.js';
import { PrismaClient } from '@prisma/client';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// --- Drizzle Client ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// --- Prisma Client ---
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function shutdownDb() {
  await pool.end();
  await prisma.$disconnect();
}