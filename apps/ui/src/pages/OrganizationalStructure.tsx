import { useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, addEdge, Background, Controls, type Connection, 
  useNodesState, useEdgesState, ReactFlowProvider, MiniMap,
  Panel, type Node, type Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { trpc } from '../utils/trpc.js';
import { 
  Network, Users, RefreshCw, 
  LayoutGrid, LayoutList, Share2, Zap, 
  Activity, Fingerprint, Box
} from 'lucide-react';
import useWebSocketStore from '../stores/websocket.store.js';

// Components & Utils
import RoleNode from '../features/creator-studio/nodes/RoleNode.js';
import { getLayoutedElements } from '../features/creator-studio/layoutUtils.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import { VisualInspectorPanel } from '../features/creator-studio/InspectorPanel.js';
import { AgentDNAlab } from '../features/dna-lab/AgentDNAlab.js';

const nodeTypes = {
  roleNode: RoleNode,
};

const OrganizationalStructureContent = () => {
  const [viewMode, setViewMode] = useState<'canvas' | 'editor' | 'graph'>('canvas');
  const [layoutDir, setLayoutDir] = useState<'TB' | 'LR'>('TB');
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch Roles via tRPC
  const { data: roles, refetch: refetchRoles, isLoading } = trpc.roles.list.useQuery(undefined, {
    enabled: viewMode === 'canvas'
  });

  // Directive Dispatcher
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: () => {
      console.log('[Directive] Successfully dispatched');
    }
  });

  // WebSocket Integration for "Big Bang" updates
  const lastEvent = useWebSocketStore(state => state.lastEvent);

  // Layout Engine: Process Roles into Nodes and Edges
  const processLayout = useCallback((rolesData: any[]) => {
    const newNodes: Node[] = rolesData.map(role => ({
      id: role.id,
      type: 'roleNode',
      data: {
        id: role.id,
        name: role.name,
        status: (role.metadata as any)?.status || 'online',
        class: (role.metadata as any)?.class || 'Code',
        vfsPath: (role.metadata as any)?.vfsPath || `/vfs/roles/${role.name.toLowerCase().replace(/ /g, '_')}`,
        systemPrompt: role.basePrompt,
        onSendDirective: (id: string, dir: string) => {
          console.log(`[Directive] To ${id}: ${dir}`);
          dispatchMutation.mutate({
            prompt: dir,
            roleId: id
          });
        }
      },
      position: { x: 0, y: 0 } // Layouted by dagre
    }));

    const newEdges: Edge[] = [];
    rolesData.forEach(role => {
      const meta = role.metadata as any;
      
      // Hierarchy Relationship (reportsTo)
      if (meta?.reportsTo) {
        newEdges.push({
          id: `e-${role.id}-${meta.reportsTo}`,
          source: meta.reportsTo,
          target: role.id,
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
          label: 'Reports To',
          labelStyle: { fill: '#a855f7', fontSize: 10, fontWeight: 'bold' }
        });
      }

      // Matrix/Peer Relationship (collaboratesWith)
      if (meta?.collaboratesWith && Array.isArray(meta.collaboratesWith)) {
        meta.collaboratesWith.forEach((otherId: string) => {
          newEdges.push({
            id: `c-${role.id}-${otherId}`,
            source: role.id,
            target: otherId,
            style: { stroke: '#71717a', strokeDasharray: '5,5', opacity: 0.6 },
            label: 'Collaborates',
            labelStyle: { fill: '#71717a', fontSize: 8 }
          });
        });
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, layoutDir);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutDir, setNodes, setEdges, dispatchMutation]);

  // Initial and reactive layout update
  useEffect(() => {
    if (roles && viewMode === 'canvas') {
      processLayout(roles);
    }
  }, [roles, viewMode, processLayout]);

  // "Big Bang" Effect: Refresh on WebSocket events
  useEffect(() => {
    if (lastEvent?.type === 'ROLE_CREATED' || lastEvent?.type === 'ROLE_UPDATED') {
      console.log(`[WebSocket] Role Event Received: ${lastEvent.type}. Redrawing canvas...`);
      refetchRoles();
    }
  }, [lastEvent, refetchRoles]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setShowInspector(true);
  }, []);

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex-none h-14 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-20">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="relative">
                  <div className="absolute -inset-1 bg-purple-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                  <div className="relative p-2 bg-zinc-900 border border-white/10 rounded-lg">
                    <Share2 size={18} className="text-purple-400" />
                  </div>
               </div>
               <div className="flex flex-col">
                  <h1 className="text-sm font-black tracking-[0.2em] uppercase text-white">Organizational Control</h1>
                  <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">Self-Assembling AI Swarm</span>
               </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-900/80 rounded-full p-1 border border-white/5">
               <button 
                  onClick={() => setViewMode('canvas')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                      viewMode === 'canvas' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
               >
                  <Users size={12} /> Canvas
               </button>
               <button 
                  onClick={() => setViewMode('editor')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                      viewMode === 'editor' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
               >
                  <Fingerprint size={12} /> Creator
               </button>
               <button 
                  onClick={() => setViewMode('graph')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                      viewMode === 'graph' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
               >
                  <Network size={12} /> Graph
               </button>
            </div>
         </div>

         {/* Right Controls */}
         <div className="flex items-center gap-4">
            {viewMode === 'canvas' && (
              <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => setLayoutDir('TB')}
                    className={`p-1.5 rounded transition-all ${layoutDir === 'TB' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    title="Hierarchical Layout"
                  >
                    <LayoutList size={16} />
                  </button>
                  <button 
                    onClick={() => setLayoutDir('LR')}
                    className={`p-1.5 rounded transition-all ${layoutDir === 'LR' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    title="Matrix Layout"
                  >
                    <LayoutGrid size={16} />
                  </button>
              </div>
            )}

            <button 
              onClick={() => refetchRoles()}
              disabled={isLoading && viewMode === 'canvas'}
              className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-purple-400 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading && viewMode === 'canvas' ? 'animate-spin' : ''} />
            </button>
            
            <SuperAiButton contextId="Organizational Structure Canvas" />
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* VIEW MODES */}
        <div className="flex-1 relative bg-[#09090b]">
            
            {/* CANVAS MODE */}
            {viewMode === 'canvas' && (
               <div className="h-full w-full relative">
                  {isLoading && nodes.length === 0 && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-4">
                              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
                              <div className="font-black text-purple-500 text-xs tracking-[0.3em] uppercase animate-pulse">Assembling Canvas...</div>
                          </div>
                      </div>
                  )}
                  
                  <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onNodeClick={onNodeClick}
                      nodeTypes={nodeTypes}
                      minZoom={0.1}
                      maxZoom={1.5}
                      fitView
                      className="bg-zinc-950"
                      snapToGrid
                      snapGrid={[20, 20]}
                  >
                      <Background color="#18181b" gap={40} size={1} />
                      <Controls className="!bg-zinc-900 !border-white/10 !fill-zinc-500" />
                      <MiniMap 
                          style={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.05)' }}
                          nodeStrokeColor="#a855f7"
                          nodeColor="#27272a"
                          maskColor="rgba(0,0,0,0.6)"
                      />

                      {/* BOTTOM LEGEND */}
                      <Panel position="bottom-center" className="mb-6">
                          <div className="px-6 py-2 bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl flex gap-8 items-center">
                              <div className="flex items-center gap-2">
                                 <Zap size={12} className="text-purple-400" />
                                 <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Hierarchy</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-4 h-[1px] bg-zinc-600 border-t border-dashed" />
                                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Collaboration</span>
                              </div>
                              <div className="h-3 w-[1px] bg-white/10" />
                              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                                 {nodes.length} AI WORKERS ONLINE
                              </div>
                          </div>
                      </Panel>
                  </ReactFlow>
               </div>
            )}

            {/* EDITOR MODE */}
            {viewMode === 'editor' && (
               <div className="h-full w-full overflow-hidden bg-zinc-950">
                  <AgentDNAlab />
               </div>
            )}

            {/* GRAPH MODE (Placeholder for existing graph logic if needed, or just standard react flow graph) */}
            {viewMode === 'graph' && (
                <div className="h-full w-full flex items-center justify-center bg-zinc-950">
                   <div className="flex flex-col items-center gap-4 text-zinc-500">
                      <Box size={48} className="opacity-20" />
                      <span className="text-xs font-black uppercase tracking-[0.4em]">Architecture Graph View</span>
                   </div>
                </div>
            )}
        </div>

        {/* INSPECTOR SIDEBAR */}
        {showInspector && viewMode === 'canvas' && (
            <div className="w-[400px] h-full border-l border-white/5 bg-zinc-950/50 backdrop-blur-2xl z-30 flex flex-col">
               <div className="flex-none h-14 border-b border-white/5 flex items-center justify-between px-6">
                  <div className="text-xs font-black uppercase tracking-widest text-zinc-100">Role Inspector</div>
                  <button onClick={() => setShowInspector(false)} className="text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-bold">Close</button>
               </div>
               <div className="flex-1 overflow-y-auto">
                    <VisualInspectorPanel 
                         selectedNodeId={selectedNodeId}
                         nodeType="ui"
                         componentName={nodes.find(n => n.id === selectedNodeId)?.data?.name || 'Unknown'}
                         currentClasses=""
                         memoryUsage={Math.floor(Math.random() * 100)}
                    />
               </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default function OrganizationalStructure() {
  return (
       <ReactFlowProvider>
         <OrganizationalStructureContent />
       </ReactFlowProvider>
  );
}
