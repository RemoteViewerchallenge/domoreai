import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { codeGraphService } from "../services/CodeGraphService.js";
import { z } from "zod";

export const codeGraphRouter = createTRPCRouter({
  getGraph: publicProcedure
    .input(z.object({ 
      division: z.string().optional(),
      showOrphans: z.boolean().optional().default(false)
    }))
    .query(async ({ input }) => {
      // Logic handled inside service now
      const nodes = await codeGraphService.generateGraph();
      
      // Simple Edge Generation based on import matching
      const edges: { id: string; source: string; target: string }[] = [];
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

      // Filter Nodes
      let filteredNodes = nodes;

      // 1. Division Filter
      if (input.division && input.division !== 'all') {
          filteredNodes = filteredNodes.filter(n => n.data?.department === input.division);
      }

      // 2. Orphan Filter (Hide if no edges connected)
      if (!input.showOrphans) {
          filteredNodes = filteredNodes.filter(n => {
              const hasSourceEdge = edges.some(e => e.source === n.id);
              const hasTargetEdge = edges.some(e => e.target === n.id);
              return hasSourceEdge || hasTargetEdge;
          });
      }

      // Filter edges to only include those between filtered nodes
      const filteredEdges = edges.filter(e => 
          filteredNodes.some(n => n.id === e.source) && 
          filteredNodes.some(n => n.id === e.target)
      );

      return { nodes: filteredNodes, edges: filteredEdges };
    }),
});
