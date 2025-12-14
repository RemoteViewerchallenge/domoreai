import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, type Connection, 
  useNodesState, useEdgesState, ReactFlowProvider, MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';
import SuperNode from '../features/creator-studio/nodes/SuperNode.js';
import { trpc } from '../utils/trpc.js';
import { VisualInspectorPanel } from '../features/creator-studio/InspectorPanel.js';
import { Layers, Server, Layout, Database, Filter, Settings } from 'lucide-react';
import { NewUIThemeProvider, useNewUITheme } from '../components/appearance/NewUIThemeProvider.js';
import type { Theme } from '../theme/types.js';

const nodeTypes = {
  superNode: SuperNode,
};

const CreatorStudioContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // View State
  const [division, setDivision] = useState<'all' | 'frontend' | 'backend' | 'database'>('all');
  const [showOrphans, setShowOrphans] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Theme State
  const { theme, setTheme } = useNewUITheme();

  const handleUpdateTheme = (partial: Partial<Theme>) => {
    setTheme(prev => ({
      ...prev,
      ...partial,
      colors: { ...prev.colors, ...(partial.colors || {}) },
      visual: { ...prev.visual, ...(partial.visual || {}) },
      animations: { ...prev.animations, ...(partial.animations || {}) },
      layout: { ...prev.layout, ...(partial.layout || {}) },
      sounds: { ...prev.sounds, ...(partial.sounds || {}) },
      widgets: { ...prev.widgets, ...(partial.widgets || {}) },
    }));
  };

  // Fetch Graph
  const { data, isLoading } = trpc.codeGraph.getGraph.useQuery({
    division,
    showOrphans
  });

  useEffect(() => {
    if (data) {
      // @ts-expect-error Type alignment
      setNodes(data.nodes);
      // @ts-expect-error Type alignment
      setEdges(data.edges);
    }
  }, [data, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Tab Component
  const Tab = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setDivision(id)}
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
    <div className="h-full w-full bg-[var(--color-background)] flex flex-col relative overflow-hidden">
      
      {/* 1. DIVISION BAR (Sub-Header only - Main Menu is in Layout) */}
      <div className="flex-none h-10 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4 z-10">
         <div className="flex h-full gap-2">
            <Tab id="all" label="Overview" icon={Layers} />
            <Tab id="frontend" label="Frontend" icon={Layout} />
            <Tab id="backend" label="Backend" icon={Server} />
            <Tab id="database" label="Data" icon={Database} />
         </div>

         <div className="flex items-center gap-2">
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
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. THEME SIDEBAR */}
        {showSidebar && (
            <div className="w-80 h-full border-l border-zinc-800 z-50 absolute right-0 top-0 bottom-0 pointer-events-auto">
               <VisualInspectorPanel 
                  selectedNodeId={nodes.find(n => n.selected)?.id || null}
                  nodeType={nodes.find(n => n.selected)?.data?.type || 'ui'}
                  componentName={nodes.find(n => n.selected)?.data?.label || 'Component'}
                  currentClasses={nodes.find(n => n.selected)?.data?.className || ''}
                  memoryUsage={12}
               />
            </div>
        )}

        {/* 3. CANVAS */}
        <div className="flex-1 relative bg-[var(--color-background)]">
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-background)]/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"/>
                       <div className="font-mono text-[var(--color-primary)] text-xs tracking-widest animate-pulse">ANALYZING CODEBASE...</div>
                    </div>
                </div>
            )}
            
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
                    // Use theme variables dynamically? ReactFlow MiniMap needs hex usually.
                    // Fallback to strict colors for minimap clarity
                    if (n.data?.department === 'frontend') return '#a855f7'; 
                    if (n.data?.department === 'backend') return '#10b981';
                    return '#52525b';
                  }}
                  style={{ backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-border)' }}
              />
            </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default function CreatorStudio() {
  return (
     <NewUIThemeProvider>
       <ReactFlowProvider>
         <CreatorStudioContent />
       </ReactFlowProvider>
     </NewUIThemeProvider>
  );
}
