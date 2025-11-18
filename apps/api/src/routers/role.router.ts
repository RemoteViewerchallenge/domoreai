import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";
import { modelManager } from "../services/modelManager.service.js";

export const roleRouter = router({
  getRoles: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    return await modelManager.getRoles(ctx.user.id);
  }),

  createRole: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await modelManager.createRole(ctx.user.id, input);
    }),

  updateRole: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await modelManager.updateRole(ctx.user.id, input);
    }),

  deleteRole: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await modelManager.deleteRole(ctx.user.id, input.id);
    }),
});
