import { createTRPCRouter, publicProcedure } from "../trpc";

export const taskRouter = createTRPCRouter({
  findMany: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.task.findMany();
  }),
});
