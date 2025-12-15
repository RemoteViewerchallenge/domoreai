import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, type Connection, 
  useNodesState, useEdgesState, ReactFlowProvider, MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';
import SuperNode from '../features/creator-studio/nodes/SuperNode.js';
import { trpc } from '../utils/trpc.js';
import { VisualInspectorPanel } from '../features/creator-studio/InspectorPanel.js';
import { Layers, Server, Layout, Database, Filter, Settings, PenTool, Network } from 'lucide-react';
import { NewUIThemeProvider, useNewUITheme } from '../components/appearance/NewUIThemeProvider.js';

// Craft.js Imports
import { Editor, Frame, Element } from '@craftjs/core';
import { CraftContainer, CraftText, CraftButton, CraftUniversalDataGrid } from '../features/ui-builder/CraftComponents.js';
import { Toolbox } from '../features/ui-builder/Toolbox.js';
import { SettingsPanel } from '../features/ui-builder/SettingsPanel.js';

const nodeTypes = {
  superNode: SuperNode,
};

const CreatorStudioContent = () => {
  // Mode State
  const [viewMode, setViewMode] = useState<'graph' | 'builder'>('graph');

  // Graph State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Graph View State
  const [division, setDivision] = useState<'all' | 'frontend' | 'backend' | 'database'>('all');
  const [showOrphans, setShowOrphans] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Theme State
  useNewUITheme();

  // Fetch Graph

  const { data, isLoading } = trpc.codeGraph.getGraph.useQuery({
    division,
    showOrphans
  }, {
    enabled: viewMode === 'graph'
  });

  useEffect(() => {
    if (data && viewMode === 'graph') {

      setNodes(data.nodes);

      setEdges(data.edges);
    }
  }, [data, setNodes, setEdges, viewMode]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Tab Component
  const Tab = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ElementType }) => (
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
      
      {/* 1. HEADER BAR */}
      <div className="flex-none h-10 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4 z-10">
         <div className="flex items-center gap-2 h-full">
            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-900 rounded p-0.5 border border-zinc-700 mr-4">
               <button 
                  onClick={() => setViewMode('graph')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors ${viewMode === 'graph' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <Network size={12} /> Graph
               </button>
               <button 
                  onClick={() => setViewMode('builder')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors ${viewMode === 'builder' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <PenTool size={12} /> Factory
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

        {/* BUILDER VIEW */}
        {viewMode === 'builder' && (
            <Editor
                resolver={{
                    CraftContainer,
                    CraftText,
                    CraftButton,
                    CraftUniversalDataGrid
                }}
            >
                <div className="flex w-full h-full bg-[#1e1e20]">
                    {/* Toolbox */}
                    <Toolbox />

                    {/* Canvas Area */}
                    <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto bg-[url('/grid-pattern.svg')]">
                        <div className="w-full max-w-[1200px] min-h-[800px] bg-zinc-950 border border-zinc-800 shadow-xl rounded-lg overflow-hidden">
                             <Frame>
                                <Element 
                                    is={CraftContainer} 
                                    canvas 
                                    background="#09090b" 
                                    padding={40}
                                    custom={{ displayName: 'App Root' }}
                                >
                                    <CraftText text="Welcome to The Factory" fontSize={24} color="#e4e4e7" />
                                    <Element is={CraftContainer} canvas background="#18181b" padding={20}>
                                        <CraftText text="Drag components here..." fontSize={14} color="#a1a1aa" />
                                    </Element>
                                </Element>
                             </Frame>
                        </div>
                    </div>

                    {/* Settings Panel */}
                    <SettingsPanel />
                </div>
            </Editor>
        )}

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
