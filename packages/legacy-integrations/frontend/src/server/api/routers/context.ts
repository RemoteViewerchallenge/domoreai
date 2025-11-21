import { createTRPCRouter, publicProcedure } from "../trpc";

export const contextRouter = createTRPCRouter({
  findMany: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.context.findMany();
  }),
});
