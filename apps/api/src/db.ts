import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Global Prisma Client Singleton
 * 
 * We use a global singleton to prevent multiple instances of Prisma Client
 * from being instantiated during hot-reloading in development.
 * 
 * In production, this simply initializes the client once.
 */
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Gracefully shuts down the database connection.
 * Should be called on server termination.
 */
export async function shutdownDb() {
  await db.$disconnect();
}