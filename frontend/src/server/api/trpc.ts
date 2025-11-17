import { initTRPC } from '@trpc/server';
import { mockPrisma } from '../../db';

export const createTRPCContext = async () => {
  return {
    prisma: mockPrisma,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
