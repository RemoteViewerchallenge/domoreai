import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  Controls, 
  Background, 
  type Node, 
  type Edge,
  ConnectionMode
} from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { DepartmentNode } from '../features/volcano/DepartmentNode.js';
import { trpc } from '../utils/trpc.js';
import { Terminal, Send, ChevronUp, ChevronDown } from 'lucide-react';

const elk = new (ELK as unknown as { new(): { layout: (graph: unknown) => Promise<{ children?: { id: string; x: number; y: number }[] }> } })();

const NODE_TYPES = {
  department: DepartmentNode,
};

// Mock data for initial layout
const INITIAL_NODES: Node[] = [
  { id: 'dept-1', type: 'department', data: { label: 'Engineering', managerRole: 'Tech Lead', departmentId: 'engineering', hasGhostBranch: true, taskStatus: 'Ready', vfsToken: 'mock-token' }, position: { x: 0, y: 0 } },
  { id: 'dept-2', type: 'department', data: { label: 'Marketing', managerRole: 'CMO', departmentId: 'marketing', hasGhostBranch: false, taskStatus: 'InProgress' }, position: { x: 0, y: 0 } },
  { id: 'dept-3', type: 'department', data: { label: 'Product', managerRole: 'Product Owner', departmentId: 'product', taskStatus: 'Blocked' }, position: { x: 0, y: 0 } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: 'dept-3', target: 'dept-1' }, // Product -> Engineering
  { id: 'e1-3', source: 'dept-3', target: 'dept-2' }, // Product -> Marketing
];

export default function CommandCenter() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const [commandInput, setCommandInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['System initialized. Listening for commands...']);

  const dispatchMutation = trpc.volcano.dispatch.useMutation({
    onSuccess: (data: { message: string }) => {
      setTerminalLogs(prev => [...prev, `[SUCCESS] ${data.message}`]);
      setCommandInput('');
    },
    onError: (error: { message: string }) => {
      setTerminalLogs(prev => [...prev, `[ERROR] ${error.message}`]);
    }
  });

  // Calculate Layout using ELK
  useEffect(() => {
    const layoutGraph = async () => {
      const graph = {
        id: 'root',
        layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.spacing.nodeNode': '80' },
        children: INITIAL_NODES.map(node => ({ id: node.id, width: 250, height: 150 })),
        edges: INITIAL_EDGES.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] }))
      };

      try {
        const calculatedGraph = await elk.layout(graph);
        
        const calculatedNodes = INITIAL_NODES.map(node => {
           const elkNode = calculatedGraph.children?.find((n: { id: string }) => n.id === node.id);
           return {
             ...node,
             position: { x: elkNode?.x || 0, y: elkNode?.y || 0 }
           };
        });

        setNodes(calculatedNodes);
        setEdges(INITIAL_EDGES);
      } catch (err) {
        console.error('ELK Layout Error:', err);
      }
    };
    
    void layoutGraph();
  }, [setNodes, setEdges]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const deptId = node.data.departmentId;
    if (deptId) {
      navigate(`/workspace/${deptId}`);
    }
  }, [navigate]);

  const handleCommandSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commandInput.trim()) return;
      
      setTerminalLogs(prev => [...prev, `> ${commandInput}`]);
      
      // Dispatch command
      dispatchMutation.mutate({
          vfsToken: 'mock-token', // TODO: Get real token
          command: commandInput
      });
  };

  return (
    <div className="h-full w-full relative flex flex-col bg-background">
      <div className="flex-1">
        {/* @ts-expect-error ReactFlow types mismatch */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeDoubleClick={onNodeDoubleClick}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Terminal Pane */}
      <div 
        className={`border-t border-border bg-card transition-all duration-300 ease-in-out flex flex-col ${isTerminalOpen ? 'h-64' : 'h-10'}`}
      >
        {/* Toggle Bar */}
        <div 
            className="h-10 border-b border-border bg-muted/30 flex items-center justify-between px-4 cursor-pointer hover:bg-muted/50"
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
        >
             <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Terminal className="h-4 w-4" />
                COMMAND CONSOLE
            </div>
            {isTerminalOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>

        {/* Console Content */}
        {isTerminalOpen && (
            <div className="flex-1 flex flex-col p-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                    {terminalLogs.map((log, i) => (
                        <div key={i} className={log.startsWith('>') ? 'text-blue-400' : log.startsWith('[ERROR]') ? 'text-red-400' : 'text-zinc-400'}>
                            {log}
                        </div>
                    ))}
                </div>
                <div className="p-2 border-t border-border bg-background">
                    <form onSubmit={handleCommandSubmit} className="flex gap-2">
                        <input 
                            className="flex-1 bg-transparent border border-input rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                            placeholder="Enter command to dispatch crew..."
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                        />
                        <button type="submit" className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90 flex items-center">
                            <Send className="h-3 w-3" />
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
