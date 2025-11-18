import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";
import { modelManager } from "../services/modelManager.service.js";

export const providersRouter = router({
  getProviders: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    return await modelManager.getProviders(ctx.user.id);
  }),

  createProvider: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await modelManager.createProvider(ctx.user.id, input);
    }),

  updateProvider: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await modelManager.updateProvider(ctx.user.id, input);
    }),
});
