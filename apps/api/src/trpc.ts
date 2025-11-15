import { initTRPC } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from './db/index.js';

// Define your context type
export interface Context {
  db: typeof db;
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;

// A simple example of a context function
export function createContext({ req, res }: CreateExpressContextOptions) {
  // You can add authentication, database connections, etc. here
  return { db };
}