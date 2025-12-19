import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, type Connection, 
  useNodesState, useEdgesState, ReactFlowProvider, MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';
import SuperNode from '../features/creator-studio/nodes/SuperNode.js';
import { trpc } from '../utils/trpc.js';
import { VisualInspectorPanel } from '../features/creator-studio/InspectorPanel.js';
import { Layers, Server, Layout, Database, Filter, Settings, Network, Users } from 'lucide-react';
import { NewUIThemeProvider, useNewUITheme } from '../components/appearance/NewUIThemeProvider.js';

// Imported Components
import RoleCreatorPanel from '../components/RoleCreatorPanel.js';
import { AIContextButton } from '../components/AIContextButton.js';

const nodeTypes = {
  superNode: SuperNode,
};

const OrganizationalStructureContent = () => {
  // Mode State: Default is 'roles'
  const [viewMode, setViewMode] = useState<'roles' | 'graph'>('roles');

  // Graph State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Graph View State
  const [division, setDivision] = useState<'all' | 'frontend' | 'backend' | 'database'>('all');
  const [showOrphans, setShowOrphans] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Theme State
  useNewUITheme();

  // Fetch Graph (Only when in graph mode)
  const { data, isLoading } = trpc.codeGraph.getGraph.useQuery({
    division,
    showOrphans
  }, {
    enabled: viewMode === 'graph'
  });

  useEffect(() => {
    if (data && viewMode === 'graph') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNodes(data.nodes as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEdges(data.edges as any);
    }
  }, [data, setNodes, setEdges, viewMode]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Tab Component
  const Tab = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ElementType }) => (
    <button 
      onClick={() => setDivision(id as 'all' | 'frontend' | 'backend' | 'database')}
      className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
        division === id 
          ? 'border-[var(--color-primary)] text-[var(--color-text)] bg-[var(--color-background-secondary)]' 
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <div className="h-full w-full bg-[var(--color-background)] flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. HEADER BAR */}
      <div className="flex-none h-12 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4 z-10">
         <div className="flex items-center gap-2 h-full">
            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-900 rounded p-0.5 border border-zinc-700 mr-4">
               <button 
                  onClick={() => setViewMode('roles')}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors ${
                      viewMode === 'roles' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
               >
                  <Users size={12} /> Roles
               </button>
               <button 
                  onClick={() => setViewMode('graph')}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors ${
                      viewMode === 'graph' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
               >
                  <Network size={12} /> Graph
               </button>
            </div>

            {/* Graph Tabs (Only visible in Graph Mode) */}
            {viewMode === 'graph' && (
                <div className="flex h-full gap-2 border-l border-zinc-800 pl-4">
                    <Tab id="all" label="Overview" icon={Layers} />
                    <Tab id="frontend" label="Frontend" icon={Layout} />
                    <Tab id="backend" label="Backend" icon={Server} />
                    <Tab id="database" label="Data" icon={Database} />
                </div>
            )}
         </div>

         {/* Right Controls */}
         <div className="flex items-center gap-2">
            <AIContextButton context={viewMode === 'roles' ? "Role Creation & Agent Logic" : "Codebase Graph Architecture"} size="sm" />
            
            {viewMode === 'graph' && (
                <>
                    <button 
                    onClick={() => setShowOrphans(!showOrphans)}
                    className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] uppercase font-bold transition-all ${showOrphans ? 'bg-[var(--color-error)]/20 border-[var(--color-error)] text-[var(--color-error)]' : 'bg-[var(--color-background-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                    >
                    <Filter size={10} />
                    {showOrphans ? 'Hidden Files Shown' : 'Hide Unconnected'}
                    </button>
                    <div className="w-px h-4 bg-[var(--color-border)]" />
                    <button onClick={() => setShowSidebar(!showSidebar)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                    <Settings size={14} />
                    </button>
                </>
            )}
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ROLES VIEW (Primary) */}
        {viewMode === 'roles' && (
            <div className="flex-1 overflow-hidden relative">
                <RoleCreatorPanel className="h-full w-full" />
            </div>
        )}

        {/* GRAPH VIEW */}
        {viewMode === 'graph' && (
            <>
                <div className="flex-1 relative bg-[var(--color-background)]">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-background)]/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"/>
                                <div className="font-mono text-[var(--color-primary)] text-xs tracking-widest animate-pulse">ANALYZING CODEBASE...</div>
                            </div>
                        </div>
                    )}
                    
                    {/* @ts-expect-error ReactFlow types mismatch */}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        minZoom={0.05} 
                        maxZoom={2}
                        fitView
                        className="bg-[var(--color-background)]"
                    >
                        <Background color="var(--color-border)" gap={40} size={1} />
                        <Controls className="bg-[var(--color-card-background)] border-[var(--color-border)] fill-[var(--color-text-muted)]" />
                        <MiniMap 
                            nodeColor={(n) => {
                                if (n.type === 'group') return 'transparent';
                                if (n.data?.department === 'frontend') return '#a855f7'; 
                                if (n.data?.department === 'backend') return '#10b981';
                                return '#52525b';
                            }}
                            style={{ backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-border)' }}
                        />
                    </ReactFlow>
                </div>

                {/* THEME SIDEBAR (Graph Only) */}
                {showSidebar && (
                    <div className="w-80 h-full border-l border-zinc-800 z-50 bg-zinc-950">
                    <VisualInspectorPanel 
                        selectedNodeId={nodes.find(n => n.selected)?.id || null}
                        nodeType={nodes.find(n => n.selected)?.data?.type || 'ui'}
                        componentName={nodes.find(n => n.selected)?.data?.label || 'Component'}
                        currentClasses={nodes.find(n => n.selected)?.data?.className || ''}
                        memoryUsage={12}
                    />
                    </div>
                )}
            </>
        )}

      </div>
    </div>
  );
};

export default function OrganizationalStructure() {
  return (
     <NewUIThemeProvider>
       <ReactFlowProvider>
         <OrganizationalStructureContent />
       </ReactFlowProvider>
     </NewUIThemeProvider>
  );
}
