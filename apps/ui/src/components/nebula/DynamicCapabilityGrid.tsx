import React, { useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import { NebulaRenderer } from '../../features/nebula-renderer/NebulaRenderer.js';
import type { NebulaNode } from '@repo/nebula';
import { nanoid } from 'nanoid';
import { Loader2, Database } from 'lucide-react';

/**
 * A Self-Adapting Grid that generates UI based on available Backend Capabilities.
 * It does not hardcode "Groq" or "Git". It reads the registry.
 */
export const DynamicCapabilityGrid = () => {
    // 1. Subscribe to Live Data (Refreshed via WebSocket triggers)
    const { data: providers, isLoading: loadingProviders } = trpc.providers.list.useQuery();
    const { data: tools, isLoading: loadingTools } = trpc.tool.list.useQuery();

    // 2. "Dream" the UI Structure based on Data (AST Transformation on the fly)
    const capabilityTree = useMemo(() => {
        if (!providers || !tools) return null;

        const nodes: NebulaNode[] = [];

        // A. Generate Provider Cards
        providers.forEach(p => {
            nodes.push({
                id: nanoid(),
                type: 'NebulaCard',
                props: {
                    title: p.label,
                    icon: 'Server',
                    status: p.isEnabled ? 'active' : 'inactive',
                    subtitle: p.type.toUpperCase(),
                    // Dynamic Action Binding
                    'data-action': `configure_provider_${p.id}`
                },
                meta: { source: 'dynamic_provider' }
            });
        });

        // B. Generate Tool Cards (Grouped by Server)
        const serverGroups = tools.reduce((acc, tool) => {
            const server = tool.serverId || 'native';
            if (!acc[server]) acc[server] = [];
            acc[server].push(tool);
            return acc;
        }, {} as Record<string, typeof tools>);

        Object.entries(serverGroups).forEach(([server, serverTools]) => {
            nodes.push({
                id: nanoid(),
                type: 'NebulaCard',
                props: {
                    title: `${server} Server`,
                    icon: 'Terminal', // Could map specific icons based on server name
                    badge: `${serverTools.length} Tools`,
                    description: `Exposes: ${serverTools.slice(0, 3).map(t => t.name.replace(`${server}_`, '')).join(', ')}...`
                },
                meta: { source: 'dynamic_mcp', serverId: server }
            });
        });

        return nodes;
    }, [providers, tools]);

    if (loadingProviders || loadingTools) return <div className="flex p-8 justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 animate-in fade-in zoom-in-95 duration-300">
            {/* Here we use the Nebula Engine to render our "Dreamed" Nodes.
         This ensures if we switch to VR or CLI later, the Logic holds.
      */}
            {capabilityTree?.map(node => (
                <NebulaRenderer key={node.id} node={node} />
            ))}

            {/* Empty State / Discovery Mode */}
            {capabilityTree?.length === 0 && (
                <div className="col-span-full border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center text-zinc-500">
                    <Database className="mx-auto mb-4 opacity-50" size={48} />
                    <p>No capabilities detected.</p>
                    <p className="text-xs mt-2">Start an MCP Server or Add a Provider to begin.</p>
                </div>
            )}
        </div>
    );
};
