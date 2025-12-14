import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, Controls, 
  useNodesState, useEdgesState, ReactFlowProvider, 
  Panel, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { trpc } from '../utils/trpc.js';
import { X, Code, Database, Server } from 'lucide-react';
import MonacoEditor from '../components/MonacoEditor.js'; // Using your existing component

// --- 1. Custom Node Components ---
const BackendNode = ({ data, selected }: any) => {
  let Icon = Server;
  let color = 'border-emerald-500 text-emerald-400';
  
  if (data.role === 'db') { Icon = Database; color = 'border-amber-500 text-amber-400'; }
  if (data.role === 'api') { Icon = Server; color = 'border-purple-500 text-purple-400'; }
  if (data.role === 'config') { Icon = Code; color = 'border-zinc-500 text-zinc-400'; }

  return (
    <div className={`
      px-4 py-2 rounded bg-zinc-900 border-2 shadow-xl transition-all min-w-[180px]
      ${selected ? 'border-white ring-2 ring-white/20' : 'border-zinc-800'}
      ${selected ? 'scale-105' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded bg-zinc-950 border ${color}`}>
            <Icon size={16} />
        </div>
        <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-200">{data.label}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{data.role}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
    </div>
  );
};

const nodeTypes = { file: BackendNode };

// --- 2. Main Canvas Logic ---
const SuperNodeCanvasContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string, label: string } | null>(null);
  const [fileContent, setFileContent] = useState("// Click a node to view source");

  // Fetch Graph
  const { data: graphData, isLoading } = trpc.codeGraph.getGraph.useQuery({ division: 'backend' });
  
  // utils for imperative fetching
  const utils = trpc.useUtils();

  const handleNodeClick = async (_: any, node: any) => {
    if (node.type === 'file') {
        setSelectedFile({ path: node.data.path, label: node.data.label });
        try {
            // Use fetch for lazy query
            const result = await utils.vfs.read.fetch({ path: node.data.path });
            setFileContent(result.content || "// Empty File");
        } catch (e) {
            setFileContent(`// Error loading file: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
  };

  // Layout Persistence
  useEffect(() => {
    if (graphData) {
      const savedLayout = JSON.parse(localStorage.getItem('backend-layout') || '{}');
      
      const mappedNodes = graphData.nodes.map((n: any) => ({
        id: n.id,
        type: 'file',
        position: savedLayout[n.id] || n.position || { x: Math.random() * 500, y: Math.random() * 500 },
        data: { label: n.label, role: n.roleId, path: n.path }
      }));

      // Generate Edges based on imports (Simple ID matching for now)
      const mappedEdges = graphData.edges.map((e: any) => ({
        ...e,
        animated: true,
        style: { stroke: '#52525b' }
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    }
  }, [graphData, setNodes, setEdges]);

  const onNodeDragStop = useCallback((_: any, node: any) => {
    const saved = JSON.parse(localStorage.getItem('backend-layout') || '{}');
    saved[node.id] = node.position;
    localStorage.setItem('backend-layout', JSON.stringify(saved));
  }, []);

  if (isLoading) return <div className="flex h-full items-center justify-center bg-zinc-950 text-white">Loading Matrix...</div>;

  return (
    <div className="flex h-full w-full bg-zinc-950">
      
      {/* 1. GRAPH AREA */}
      <div className="flex-1 h-full relative border-r border-zinc-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
          <Panel position="top-left" className="bg-zinc-900/80 p-2 rounded border border-zinc-800 text-zinc-400 text-xs">
            Backend Architecture
          </Panel>
        </ReactFlow>
      </div>

      {/* 2. CODE INSPECTOR (Right Rail) */}
      {selectedFile && (
        <div className="w-[600px] h-full flex flex-col bg-[#1e1e1e] border-l border-zinc-800 shadow-2xl z-50">
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#252526] border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Code size={14} className="text-blue-400" />
                    <span className="text-sm font-mono text-zinc-200 truncate max-w-[400px]">
                        {selectedFile.label}
                    </span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-zinc-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden">
                <MonacoEditor
                    value={fileContent}
                    language="typescript"
                    onChange={() => {}} // Read-only for now
                    theme="vs-dark"
                />
            </div>
            
            {/* Footer Status */}
            <div className="h-6 bg-blue-600/20 text-blue-400 text-[10px] px-2 flex items-center">
                READ-ONLY MODE • {selectedFile.path}
            </div>
        </div>
      )}
    </div>
  );
};

export default function SuperNodeCanvas() {
  return (
    <ReactFlowProvider>
        <SuperNodeCanvasContent />
    </ReactFlowProvider>
  );
}
