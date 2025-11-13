import { createTRPCRouter, publicProcedure } from '../trpc';
import contexts from '../mockData/contexts.json';

/**
 * Defines the tRPC router for context-related API endpoints.
 * This router provides a procedure to fetch all available contexts from a mock JSON file.
 */
export const contextRouter = createTRPCRouter({
  /**
   * A public procedure that returns a list of all contexts.
   * This is a query-based endpoint that does not require authentication.
   *
   * @returns {Array} A list of context objects, each containing an id, name, and description.
   */
  findMany: publicProcedure.query(() => {
    return contexts;
  }),
});
