import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Bot } from 'lucide-react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import default ReactFlow styles
import { AiButton } from '../../NUI/ui/AiButton.js';
import CoorpNode from '../components/nodes/CoorpNode.js'; // Import custom node component

const nodeTypes = { coorpNode: CoorpNode };


/**
 * COORP (Cognitive Orchestration & Routing Platform) Page
 * Visual graph interface for managing AI orchestration nodes and edges
 */
export default function COORP() {
  const initialNodes: Node[] = [
    { id: '1', type: 'coorpNode', position: { x: 100, y: 100 }, data: { label: 'Start' } },
    { id: '2', type: 'coorpNode', position: { x: 300, y: 100 }, data: { label: 'Process' } },
    { id: '3', type: 'coorpNode', position: { x: 500, y: 100 }, data: { label: 'End' } },
  ];
  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const [activeTab, setActiveTab] = useState('Structure');

  const handleAiResult = (result: { success: boolean; message: string; data?: Record<string, unknown> }) => {
    console.log('AI Result:', result);
    // TODO: Handle AI result - could update node, create new nodes, etc.
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Header */}
      <div className="flex-none h-12 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot size={24} className="text-[var(--color-primary)]" />
          <h1 className="text-lg font-bold tracking-wider">COORP</h1>
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Cognitive Orchestration Platform
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {['Structure', 'Crews', 'Projects'].map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background-tertiary)]'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Quick actions will go here */}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Role & Department Tree */}
        <div className="flex-none w-64 bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] p-4 overflow-y-auto">
          <h2 className="text-md font-bold mb-4 text-[var(--color-text)]">Role Tree</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Placeholder for role and department hierarchy.</p>
        </div>

        {/* Center Pane - Graph Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Right Pane - Role Detail Inspector */}
        <div className="flex-none w-80 bg-[var(--color-background-secondary)] border-l border-[var(--color-border)] p-4 overflow-y-auto">
          <h2 className="text-md font-bold mb-4 text-[var(--color-text)]">Details</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Placeholder for selected node details.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none h-8 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] flex items-center justify-between px-4">
        <span className="text-xs text-[var(--color-text-muted)]">COORP Canvas</span>
        <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
          Feature Preview
        </span>
      </div>
    </div>
  );
}
