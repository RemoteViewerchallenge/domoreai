import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { codeGraphService } from "../services/CodeGraphService.js";
import { z } from "zod";

export const codeGraphRouter = createTRPCRouter({
  getGraph: publicProcedure
    .input(z.object({ 
      division: z.string().optional()
    }))
    .query(async ({ input }) => {
      // Logic handled inside service now
      const nodes = await codeGraphService.generateGraph();
      
      // Simple Edge Generation based on import matching
      const edges: any[] = [];
      nodes.forEach(source => {
          source.imports.forEach(imp => {
              // Find target node that includes the import path
              const target = nodes.find(n => n.path.includes(imp) || n.path === imp + '.ts');
              if (target) {
                  edges.push({
                      id: `${source.id}-${target.id}`,
                      source: source.id,
                      target: target.id
                  });
              }
          });
      });

      return { nodes, edges };
    }),
});
