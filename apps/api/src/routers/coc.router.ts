import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

/**
 * CoC (Chain of Command) Router
 * 
 * Exposes the advanced multi-agent orchestration logic from packages/coc
 * to the frontend via tRPC.
 */
export const cocRouter = createTRPCRouter({
  /**
   * Execute a CoC directive (YAML/JSON spec)
   */
  executeDirective: publicProcedure
    .input(
      z.object({
        spec: z.union([
          z.string(), // YAML or JSON string
          z.object({
            spec: z.array(z.any()),
          }), // Pre-parsed object
        ]),
        meta: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Dynamically import CoC to avoid loading it on API startup
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { runDirective } = await import('@domoreai/coc');
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const result = await runDirective(input.spec, input.meta || {});
        return {
          success: true,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get CoC event traces
   * (reads from out/traces/events.jsonl)
   */
  getTraces: publicProcedure
    .input(
      z.object({
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const fs = await import('fs');
      const path = await import('path');
      
      const tracePath = path.join(process.cwd(), 'out', 'traces', 'events.jsonl');
      
      if (!fs.existsSync(tracePath)) {
        return { events: [] };
      }

      const content = fs.readFileSync(tracePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      // Take last N lines
      const recentLines = lines.slice(-input.limit);
      
      const events = recentLines.map(line => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      return { events };
    }),

  /**
   * Get bandit state (model & role bandits)
   */
  getBanditState: publicProcedure.query(async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const modelBanditPath = path.join(process.cwd(), 'out', 'model_bandit_state.json');
    const roleBanditPath = path.join(process.cwd(), 'out', 'role_bandit_state.json');
    
    let modelBandit = null;
    let roleBandit = null;
    
    if (fs.existsSync(modelBanditPath)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      modelBandit = JSON.parse(fs.readFileSync(modelBanditPath, 'utf-8'));
    }
    
    if (fs.existsSync(roleBanditPath)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      roleBandit = JSON.parse(fs.readFileSync(roleBanditPath, 'utf-8'));
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { modelBandit, roleBandit };
  }),
});
