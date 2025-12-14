import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { codeGraphService } from "../services/CodeGraphService.js";
import { z } from "zod";

export const codeGraphRouter = createTRPCRouter({
  getGraph: publicProcedure
    .input(z.object({ 
      path: z.string().optional(),
      division: z.enum(['all', 'frontend', 'backend', 'database', 'core']).optional().default('all'),
      showOrphans: z.boolean().optional().default(false)
    }))
    .query(async ({ input }) => {
      const allNodes = await codeGraphService.generateGraph(input.path);
      
      // 1. Filter Logic
      let filteredNodes = allNodes.filter(n => {
        if (n.type === 'directory') return false; // Flatten: Show files only
        
        if (input.division === 'all') return true;
        if (input.division === 'frontend') return n.roleId.includes('frontend') || n.roleId.includes('ui');
        if (input.division === 'backend') return n.roleId.includes('backend') || n.roleId.includes('api');
        if (input.division === 'database') return n.roleId.includes('data') || n.roleId.includes('prisma');
        return false;
      });

      // 2. Generate Edges
      const edges: any[] = [];
      filteredNodes.forEach(source => {
        source.imports.forEach(imp => {
          const targetFile = imp.split('/').pop() || '';
          const target = filteredNodes.find(n => n.id.endsWith(`${targetFile}.ts`) || n.id.endsWith(`${targetFile}.tsx`));
          
          if (target && target.id !== source.id) {
            edges.push({
              id: `e-${source.id}-${target.id}`,
              source: source.id,
              target: target.id,
              animated: true,
              style: { stroke: 'var(--color-border)', strokeWidth: 2 } // CSS Var support in Edge? No, typically Hex.
              // style: { stroke: '#52525b', strokeWidth: 1.5 } 
            });
          }
        });
      });

      // 3. Orphan Logic
      if (!input.showOrphans) {
        const activeIds = new Set<string>();
        edges.forEach(e => { activeIds.add(e.source); activeIds.add(e.target); });
        filteredNodes = filteredNodes.filter(n => activeIds.has(n.id));
      }

      // 4. Vertical Stack Layout
      const roleGroups: Record<string, typeof filteredNodes> = {};
      filteredNodes.forEach(n => {
        const group = n.roleId || 'general';
        if (!roleGroups[group]) roleGroups[group] = [];
        roleGroups[group].push(n);
      });

      const flowNodes = [];
      let currentY = 0;

      // Sort order: Frontend -> Backend -> Data -> DevOps
      const sortOrder = ['frontend-lead', 'ui-engineer', 'backend-architect', 'data-engineer', 'database-admin'];
      const sortedKeys = Object.keys(roleGroups).sort((a, b) => {
        return sortOrder.indexOf(a) - sortOrder.indexOf(b);
      });

      for (const role of sortedKeys) {
        const nodes = roleGroups[role];
        const ITEMS_PER_ROW = 6;
        const ROW_HEIGHT = 180;
        const COL_WIDTH = 320;
        
        const groupHeight = Math.ceil(nodes.length / ITEMS_PER_ROW) * ROW_HEIGHT + 100;
        const groupWidth = ITEMS_PER_ROW * COL_WIDTH + 50;

        // Group Container
        flowNodes.push({
          id: `group-${role}`,
          type: 'group',
          position: { x: 0, y: currentY },
          style: { 
             width: groupWidth, 
             height: groupHeight,
             backgroundColor: 'rgba(255,255,255,0.02)', // Subtle fill
             border: '1px dashed rgba(120,120,120,0.2)',
             borderRadius: '8px'
          },
          data: { label: role.toUpperCase().replace('-', ' ') }
        });

        // Nodes
        nodes.forEach((n, i) => {
          const row = Math.floor(i / ITEMS_PER_ROW);
          const col = i % ITEMS_PER_ROW;
          
          flowNodes.push({
            id: n.id,
            type: 'superNode',
            parentNode: `group-${role}`,
            extent: 'parent',
            position: { 
               x: col * COL_WIDTH + 25, 
               y: row * ROW_HEIGHT + 60 
            },
            data: { 
              label: n.label,
              type: 'code',
              department: role.split('-')[0], 
              roleId: n.roleId,
              filePath: n.path
            }
          });
        });

        currentY += groupHeight + 150; // Vertical spacing between departments
      }

      return { nodes: flowNodes, edges };
    }),
});
