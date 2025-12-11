import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Users, Database, Settings, Plus, Play, Save, 
  Layers, Box, Cpu, Shield, FileCode, Terminal, 
  Zap, MessageSquare, Move, Search, Maximize, 
  Minimize, Trash2, Copy, Bot, Network, X, ChevronDown
} from 'lucide-react';

// --- TYPES ---

type NodeType = 'corp' | 'division' | 'team' | 'agent';

interface NodePosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  description: string;
  position: NodePosition;
  modelConfig?: {
    model: string;
    temperature: number;
  };
  status?: 'idle' | 'working' | 'error';
}

const INITIAL_NODES: OrgNode[] = [
  {
    id: 'corp-root',
    parentId: null,
    name: 'DoMoreAI Corp',
    type: 'corp',
    description: 'Global Context & Strategy (Corporation Node)',
    position: { x: 50, y: 50, w: 1200, h: 800 },
    status: 'idle'
  },
  {
    id: 'div-eng',
    parentId: 'corp-root',
    name: 'Engineering Division',
    type: 'division',
    description: 'Product & Infrastructure (AI Overseer)',
    position: { x: 80, y: 150, w: 500, h: 600 },
    status: 'working'
  },
  {
    id: 'team-frontend',
    parentId: 'div-eng',
    name: 'Frontend Team',
    type: 'team',
    description: 'UI/UX & React Components (Workflow Orchestrator)',
    position: { x: 120, y: 250, w: 400, h: 400 },
    status: 'idle'
  },
  {
    id: 'agent-coder',
    parentId: 'team-frontend',
    name: 'React Coder Agent',
    type: 'agent',
    description: 'Generates UI code (Role Card)',
    position: { x: 150, y: 350, w: 280, h: 100 },
    modelConfig: { model: 'Claude-3.5-Sonnet', temperature: 0.2 },
    status: 'idle'
  },
  {
    id: 'agent-qa',
    parentId: 'team-frontend',
    name: 'Design QA Agent',
    type: 'agent',
    description: 'Validates styles (Role Card)',
    position: { x: 150, y: 470, w: 280, h: 100 },
    modelConfig: { model: 'GPT-4o', temperature: 0.1 },
    status: 'idle'
  },
  {
    id: 'div-sales',
    parentId: 'corp-root',
    name: 'Sales Division',
    type: 'division',
    description: 'Outreach & Revenue (AI Overseer)',
    position: { x: 650, y: 150, w: 500, h: 600 },
    status: 'idle'
  }
];

// --- STYLES ---
const colors = {
  bg: '#09090b',
  grid: '#27272a',
  nodeBg: '#18181b',
  border: '#27272a',
  primary: '#3b82f6',
  accent: '#8b5cf6',
  text: '#e4e4e7',
  textMuted: '#a1a1aa'
};

// --- HELPER COMPONENTS ---

const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => (
  <div className="group relative">
    {children}
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-zinc-800 text-[10px] text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {text}
    </div>
  </div>
);

interface NodeSettingsModalProps {
    node: OrgNode;
    nodes: OrgNode[];
    onClose: () => void;
    onSave: (node: OrgNode) => void;
}

const NodeSettingsModal: React.FC<NodeSettingsModalProps> = ({ node, nodes, onClose, onSave }) => {
    const [name, setName] = useState(node.name);
    const [description, setDescription] = useState(node.description);
    const [parentId, setParentId] = useState<string | null>(node.parentId);

    // Filter out the current node and its children to prevent circular dependencies
    const validParentNodes = nodes.filter(n => n.id !== node.id); 

    const handleSave = () => {
        onSave({
            ...node,
            name,
            description,
            parentId
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-[500px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings size={18} className="text-purple-400" />
                        Edit Node: {node.name}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 resize-none"
                        />
                    </div>

                    {/* Parent Node (Link) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Parent Container</label>
                        <select
                            value={parentId || ''}
                            onChange={(e) => setParentId(e.target.value || null)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">(No Parent / Root)</option>
                            {validParentNodes
                                .filter(n => n.type !== 'agent') // Agents cannot be parents (Containers only)
                                .map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.name} ({n.type.toUpperCase()})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-1">
                            This determines the line connection and containment hierarchy.
                        </p>
                    </div>

                    {/* Agent/Model Config (Simplified) */}
                    {node.type === 'agent' && (
                        <div className="pt-2 border-t border-zinc-800">
                            <h4 className="text-sm font-bold text-zinc-300 mb-2">Agent Config</h4>
                            {/* In a real app, this would be complex settings */}
                            <div className="text-xs text-zinc-400 bg-zinc-800 p-2 rounded">
                                Model: **{node.modelConfig?.model || 'N/A'}** | Temperature: **{node.modelConfig?.temperature || 'N/A'}**
                                <br/>*Edit role parameters in the dedicated Role Creator.*
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-zinc-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-purple-900/50"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN CANVAS COMPONENT ---

const NODE_WIDTH = 280;
const NODE_HEIGHT = 100;
const CONTAINER_MIN_SIZE = 150;

export default function App() {
  const [nodes, setNodes] = useState<OrgNode[]>(INITIAL_NODES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  
  // Viewport State
  const [transform, setTransform] = useState({ x: 100, y: 50, scale: 0.8 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Node Drag State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  // Tool/Sidebar State
  const [draggedToolType, setDraggedToolType] = useState<NodeType | null>(null);

  // Interaction Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- ACTIONS ---

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, transform.scale - e.deltaY * zoomSensitivity), 3);
      setTransform(prev => ({ ...prev, scale: newScale }));
    } else {
      // Pan
      setTransform(prev => ({ 
        ...prev, 
        x: prev.x - e.deltaX, 
        y: prev.y - e.deltaY 
      }));
    }
  }, [transform.scale]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only clear selection if not dragging or clicking a node
    if (e.button === 0 && !e.shiftKey && !draggingNodeId) {
        setSelectedIds(new Set());
    }
    if (e.button === 1 || e.button === 0 && !draggingNodeId) { // Middle click or Left click on empty space
      setIsDraggingCanvas(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId) {
      const dx = (e.clientX - lastMousePos.x) / transform.scale;
      const dy = (e.clientY - lastMousePos.y) / transform.scale;
      
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: {
              ...n.position,
              x: n.position.x + dx,
              y: n.position.y + dy
            }
          };
        }
        return n;
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  // --- NODE CRUD & EDITING ---

  const handleNodeSave = (updatedNode: OrgNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingNodeId(id);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    
    // Select logic
    if (!e.shiftKey) {
        setSelectedIds(new Set([id]));
    } else {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = new Set(selectedIds);
    // Find all children of deleted nodes and orphan them
    const newNodes = nodes.map(n => {
        if (idsToDelete.has(n.id)) {
            return null; // Mark for deletion
        }
        if (n.parentId && idsToDelete.has(n.parentId)) {
            // Orphan the child and potentially adopt it by its grand-parent 
            // For simplicity here, we just orphan (set parentId to null)
            return { ...n, parentId: null }; 
        }
        return n;
    }).filter((n): n is OrgNode => n !== null); // Filter out nulls

    setNodes(newNodes);
    setSelectedIds(new Set());
  };

  const duplicateSelected = () => {
    const newNodes = nodes
        .filter(n => selectedIds.has(n.id))
        .map(n => ({
            ...n,
            id: `${n.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: `Copy of ${n.name}`,
            position: { ...n.position, x: n.position.x + 20, y: n.position.y + 20 }
        }));
    setNodes(prev => [...prev, ...newNodes]);
    setSelectedIds(new Set(newNodes.map(n => n.id))); // Select the new copies
  };


  // --- DRAG & DROP CREATION ---

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedToolType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate drop position in Canvas Coordinates
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;

    // Determine default size and description based on type
    let w = NODE_WIDTH, h = NODE_HEIGHT;
    let description = 'New Role Card.';
    let name = `New ${draggedToolType}`;
    
    if (draggedToolType === 'corp') { w = 800; h = 600; description = 'Top-level Corporation Node.'; name = 'New Corporation'; }
    if (draggedToolType === 'division') { w = 500; h = 500; description = 'New Division Container (AI Overseer).'; name = 'New Division'; }
    if (draggedToolType === 'team') { w = 400; h = 400; description = 'New Team Container (Workflow Orchestrator).'; name = 'New Team'; }

    const newNode: OrgNode = {
      id: `${draggedToolType}-${Date.now()}`,
      parentId: null, // Default to null, user can link via settings modal
      name: name,
      type: draggedToolType,
      description: description,
      position: { x, y, w, h },
      status: 'idle',
      modelConfig: draggedToolType === 'agent' ? { model: 'Gemini-2.5-Flash', temperature: 0.5 } : undefined,
    };

    setNodes(prev => [...prev, newNode]);
    setDraggedToolType(null);
  };

  // --- RENDERERS ---

  const getIconForType = (type: NodeType, color: string) => {
    switch (type) {
      case 'corp': return <Box size={14} className={color} />;
      case 'division': return <Layers size={14} className={color} />;
      case 'team': return <Users size={14} className={color} />;
      case 'agent': return <Bot size={14} className={color} />;
      default: return <ChevronDown size={14} className={color} />;
    }
  };
  
  const renderNode = (node: OrgNode) => {
    const isSelected = selectedIds.has(node.id);
    const isContainer = node.type !== 'agent';
    
    // Type-specific Styles
    let borderClass = 'border-zinc-800';
    let bgClass = 'bg-[#18181b]';
    let headerColor = 'text-zinc-400';
    
    if (node.type === 'corp') { borderClass = 'border-blue-900'; bgClass = 'bg-black'; headerColor = 'text-blue-400'; }
    if (node.type === 'division') { borderClass = 'border-purple-900/50'; bgClass = 'bg-[#13111c]'; headerColor = 'text-purple-400'; }
    if (node.type === 'team') { borderClass = 'border-green-900/50'; bgClass = 'bg-[#0f1613]'; headerColor = 'text-green-400'; }
    if (node.type === 'agent') { borderClass = 'border-cyan-800'; bgClass = 'bg-zinc-900'; headerColor = 'text-cyan-400'; }

    if (isSelected) borderClass = 'border-white ring-2 ring-white/50';

    return (
      <div
        key={node.id}
        className={`absolute rounded-lg border shadow-2xl flex flex-col overflow-hidden transition-all duration-100 ${borderClass} ${bgClass}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: node.position.w,
          height: node.position.h,
          boxShadow: isSelected ? '0 0 0 2px white' : '0 10px 30px rgba(0,0,0,0.5)',
          minWidth: isContainer ? CONTAINER_MIN_SIZE : NODE_WIDTH,
          minHeight: isContainer ? CONTAINER_MIN_SIZE : NODE_HEIGHT,
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      >
        {/* Node Header - Draggable Area */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
             {getIconForType(node.type, headerColor)}
             <span className={`text-xs font-bold ${headerColor}`}>{node.name}</span>
          </div>
          <div className="flex items-center gap-1">
             {/* AI Overseer / Settings Button */}
             <Tooltip text={isContainer ? "AI Overseer (Click to Edit)" : "Agent Settings"}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
                    className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                >
                    <Zap size={12} className={node.status === 'working' ? 'text-yellow-400 animate-pulse' : 'text-zinc-500'} />
                </button>
             </Tooltip>

             {/* More Actions */}
             <button onClick={(e) => { e.stopPropagation(); /* Future: Context Menu */ }} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                <Settings size={12} />
             </button>
          </div>
        </div>

        {/* Node Content */}
        <div className="flex-1 p-3 relative">
           <p className="text-[10px] text-zinc-500 italic mb-2">{node.description}</p>
           
           {node.type === 'agent' && (
             <div className="mt-2 space-y-1">
                <div className="bg-black/50 p-1.5 rounded border border-white/5 flex items-center justify-between">
                   <span className="text-[9px] text-zinc-400">Model</span>
                   <span className="text-[9px] text-cyan-300 font-mono">{node.modelConfig?.model || 'N/A'}</span>
                </div>
                <div className="flex gap-2 pt-1">
                   <button className="flex-1 bg-cyan-900/20 border border-cyan-800/50 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1">
                      <Play size={10} /> Execute
                   </button>
                   <button className="flex-1 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1">
                      <Terminal size={10} /> Monitor
                   </button>
                </div>
             </div>
           )}

           {isContainer && (
             <div className="absolute bottom-2 right-2 opacity-5 text-zinc-600">
                <Network size={64} />
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderConnections = () => {
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
        {nodes.map(node => {
           if (!node.parentId) return null;
           const parent = nodes.find(n => n.id === node.parentId);
           if (!parent) return null;

           // Calculate center points
           const x1 = parent.position.x + (parent.position.w / 2);
           const y1 = parent.position.y + (parent.position.h / 2);
           const x2 = node.position.x + (node.position.w / 2);
           const y2 = node.position.y + (node.position.h / 2);

           return (
             <line 
               key={`link-${node.id}`}
               x1={x1} y1={y1} x2={x2} y2={y2}
               stroke="#3f3f46"
               strokeWidth="2"
               strokeDasharray="4 4"
             />
           );
        })}
      </svg>
    );
  };

  const activeNode = nodes.find(n => n.id === editingNodeId);

  return (
    <div className="w-screen h-screen flex bg-black text-zinc-200 overflow-hidden font-sans select-none">
      
      {/* 1. TOOLBOX SIDEBAR (Draggables) */}
      <div className="w-16 flex-none border-r border-zinc-800 bg-[#0c0c0e] flex flex-col items-center py-4 gap-4 z-20">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/50 mb-4">
           COORP
        </div>
        
        <Tooltip text="New Corporation (Node)">
          <div 
            draggable 
            onDragStart={() => setDraggedToolType('corp')}
            className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center hover:border-blue-500 hover:text-blue-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <Box size={20} />
          </div>
        </Tooltip>

        <Tooltip text="New Division (Overseer)">
          <div 
            draggable 
            onDragStart={() => setDraggedToolType('division')}
            className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center hover:border-purple-500 hover:text-purple-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <Layers size={20} />
          </div>
        </Tooltip>

        <Tooltip text="New Team (Orchestration)">
          <div 
            draggable 
            onDragStart={() => setDraggedToolType('team')}
            className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center hover:border-green-500 hover:text-green-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <Users size={20} />
          </div>
        </Tooltip>

        <Tooltip text="New Agent (Role Card)">
          <div 
            draggable 
            onDragStart={() => setDraggedToolType('agent')}
            className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <Bot size={20} />
          </div>
        </Tooltip>

        <div className="mt-auto flex flex-col gap-2">
           <Tooltip text="Zoom In">
             <button onClick={() => setTransform(t => ({...t, scale: t.scale * 1.2}))} className="p-2 hover:bg-zinc-800 rounded"><Maximize size={16}/></button>
           </Tooltip>
           <Tooltip text="Zoom Out">
             <button onClick={() => setTransform(t => ({...t, scale: t.scale / 1.2}))} className="p-2 hover:bg-zinc-800 rounded"><Minimize size={16}/></button>
           </Tooltip>
           <Tooltip text="Recenter View">
             <button onClick={() => setTransform({ x: 100, y: 50, scale: 0.8 })} className="p-2 hover:bg-zinc-800 rounded">
                <Move size={16} />
             </button>
           </Tooltip>
        </div>
      </div>

      {/* 2. INFINITE CANVAS */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-[#09090b] cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            backgroundImage: `radial-gradient(${colors.grid} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            width: '10000px', // Massive area simulation
            height: '10000px'
          }}
        />

        {/* Transform Layer */}
        <div 
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {renderConnections()}
          {nodes.map(renderNode)}
        </div>

        {/* Floating Controls (CRUD) */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 p-2 rounded-lg shadow-2xl flex items-center gap-2 z-40">
             <span className="text-[10px] text-zinc-500 px-2 font-bold uppercase">{selectedIds.size} Selected</span>
             <div className="w-px h-4 bg-zinc-700 mx-1" />
             <button onClick={duplicateSelected} className="flex items-center gap-1 px-3 py-1.5 hover:bg-zinc-800 rounded text-xs transition-colors">
               <Copy size={14} /> Duplicate
             </button>
             <button onClick={deleteSelected} className="flex items-center gap-1 px-3 py-1.5 hover:bg-red-900/50 hover:text-red-400 rounded text-xs transition-colors">
               <Trash2 size={14} /> Delete
             </button>
          </div>
        )}

        {/* Info Overlay */}
        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 p-2 rounded text-[10px] text-zinc-500 font-mono z-40">
           POS: {Math.round(transform.x)},{Math.round(transform.y)} | ZOOM: {transform.scale.toFixed(2)}x
        </div>
      </div>

      {/* Node Settings Modal */}
      {activeNode && (
        <NodeSettingsModal
            node={activeNode}
            nodes={nodes}
            onClose={() => setEditingNodeId(null)}
            onSave={handleNodeSave}
        />
      )}
    </div>
  );
}