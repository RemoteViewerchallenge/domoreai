import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";

export const llmRouter = router({
  getModels: protectedProcedure.query(async () => {
    return [];
  }),
});
