import React, { useCallback } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, type Connection, 
  useNodesState, useEdgesState, ReactFlowProvider, type NodeTypes 
} from 'reactflow';
import 'reactflow/dist/style.css';
import SuperNode from '../features/creator-studio/nodes/SuperNode.js';
import { Database, Server } from 'lucide-react';
import { NewUIRoot } from '../components/appearance/NewUIRoot.js';

const nodeTypes: NodeTypes = {
  superNode: SuperNode,
};

const SuperNodeCanvasContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type: 'data' | 'api') => {
    const id = `${Date.now()}`;
    const newNode = {
      id,
      type: 'superNode',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { type, stats: { rows: 0, status: 'IDLE' } },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col relative">
      
      {/* Canvas */}
      <div className="flex-1 h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
        </ReactFlow>
      </div>

      {/* Floating Toolbar (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-1 bg-zinc-900/90 border border-zinc-800 rounded-full shadow-2xl backdrop-blur-sm z-50">
        <button 
            onClick={() => addNode('data')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-zinc-300 hover:text-[var(--color-primary)] transition-colors"
        >
            <Database size={16} /> <span className="text-xs font-bold">DATA</span>
        </button>
        <div className="w-px bg-zinc-800 my-1" />
        <button 
            onClick={() => addNode('api')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-zinc-300 hover:text-[var(--color-secondary)] transition-colors"
        >
            <Server size={16} /> <span className="text-xs font-bold">API</span>
        </button>
      </div>
    </div>
  );
};

export default function SuperNodeCanvas() {
  return (
    <NewUIRoot>
       <ReactFlowProvider>
         <SuperNodeCanvasContent />
       </ReactFlowProvider>
    </NewUIRoot>
  );
}
