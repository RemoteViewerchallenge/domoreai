import React, { useState, useRef, useEffect, useMemo } from 'react';
import { trpc } from '../../../utils/trpc.js';
import { FileExplorer } from '../../../components/filesystem/FileExplorer.js'; 
import { VisualQueryBuilder } from '../../../components/data/VisualQueryBuilder.js';
import { 
  Database, Table, Plus, Minimize2, Maximize2, 
  Sparkles, Link2, Download, Upload, Trash2, 
  Film, FileAudio, FileText, Image, Zap, X, Save, FolderOpen,
  Code, Layout, Grid, Eye, PlayCircle, FileCode, Archive,
  MoreVertical, Search, ArrowRight, Layers
} from 'lucide-react';

// --- VISUAL THEME ---
const colors = {
  bg: '#0a0e14',
  bgCard: '#13171f',
  bgHeader: '#1a1f2e',
  border: '#2d3748',
  primary: '#60a5fa',
  secondary: '#a78bfa',
  accent: '#34d399',
  warning: '#fbbf24',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
};

// --- TYPES ---
interface NodePosition {
  x: number;
  y: number;
}

interface TableNodeData {
  id: string;
  tableName: string; // The real SQL table name
  position: NodePosition;
  expanded: boolean;
}

interface Connection {
  id: string;
  from: { nodeId: string; tableName: string; column: string };
  to: { nodeId: string; tableName: string; column: string };
}

// --- MAIN COMPONENT ---
export const AdaptiveDataExplorer: React.FC = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'data' | 'assets' | 'dashboard'>('data');
  const [nodes, setNodes] = useState<TableNodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [drawingConnection, setDrawingConnection] = useState<{ sourceNodeId: string; sourceTable: string; sourceColumn: string } | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  
  // --- TRPC HOOKS ---
  const utils = trpc.useContext();
  const { data: allTables } = trpc.dataRefinement.listAllTables.useQuery();
  
  const createTableMutation = trpc.dataRefinement.createTable.useMutation({
    onSuccess: () => utils.dataRefinement.listAllTables.invalidate()
  });

  const deleteTableMutation = trpc.dataRefinement.deleteTable.useMutation({
    onSuccess: (data, variables) => {
      utils.dataRefinement.listAllTables.invalidate();
      // Remove node if it exists
      setNodes(prev => prev.filter(n => n.tableName !== variables.tableName));
    }
  });

  // --- CANVAS HANDLERS ---
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingNode) {
        setNodes(prev => prev.map(n => 
          n.id === draggingNode 
            ? { ...n, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
            : n
        ));
      }
    };

    const handleMouseUp = () => {
      setDraggingNode(null);
    };

    if (draggingNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNode, dragOffset]);

  // --- CONNECTION LOGIC ---
  const startConnection = (nodeId: string, tableName: string, column: string) => {
    setDrawingConnection({ sourceNodeId: nodeId, sourceTable: tableName, sourceColumn: column });
  };

  const completeConnection = (nodeId: string, tableName: string, column: string) => {
    if (drawingConnection && drawingConnection.sourceNodeId !== nodeId) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from: { nodeId: drawingConnection.sourceNodeId, tableName: drawingConnection.sourceTable, column: drawingConnection.sourceColumn },
        to: { nodeId, tableName, column }
      };
      setConnections(prev => [...prev, newConnection]);
      
      // Build AI Prompt
      const suggestion = `Alignment Task: Map column '${drawingConnection.sourceColumn}' from table '${drawingConnection.sourceTable}' to column '${column}' in table '${tableName}'.\nAction: Extract context and normalize data types.`;
      setAiPrompt(prev => prev ? `${prev}\n\n${suggestion}` : suggestion);
      setShowAIPanel(true);
    }
    setDrawingConnection(null);
  };

  const addTableNode = (tableName: string) => {
    const newNode: TableNodeData = {
      id: `node-${tableName}-${Date.now()}`,
      tableName,
      position: { x: 100 + (nodes.length * 30), y: 100 + (nodes.length * 30) },
      expanded: true,
    };
    setNodes(prev => [...prev, newNode]);
    setShowTableSelector(false);
  };

  const handleCreateNewTable = () => {
    const name = prompt("Enter new table name:");
    if (name) {
        createTableMutation.mutate({ tableName: name });
        // We'll add it to nodes once it appears in the list, or we can add optimistically
        setTimeout(() => addTableNode(name), 500);
    }
  };

  // --- INNER COMPONENTS ---

  const TableNode = ({ node }: { node: TableNodeData }) => {
    // Each node fetches its own data
    const { data: tableData, isLoading } = trpc.dataRefinement.getTableData.useQuery(
      { tableName: node.tableName, limit: 50 },
      { enabled: !!node.tableName }
    );

    const columns = tableData && tableData.rows.length > 0 
      ? Object.keys(tableData.rows[0]) 
      : ['id', 'created_at', 'data']; // Fallback columns

    const toggleExpand = () => {
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, expanded: !n.expanded } : n));
    };

    const removeNode = () => {
      setNodes(prev => prev.filter(n => n.id !== node.id));
      setConnections(prev => prev.filter(c => c.from.nodeId !== node.id && c.to.nodeId !== node.id));
    };

    return (
      <div 
        className="absolute rounded-lg overflow-hidden border-2 transition-all select-none flex flex-col"
        style={{
          left: node.position.x,
          top: node.position.y,
          backgroundColor: colors.bgCard,
          borderColor: draggingNode === node.id ? colors.accent : colors.primary,
          boxShadow: draggingNode === node.id ? `0 0 30px ${colors.primary}40` : `0 0 10px ${colors.primary}10`,
          width: node.expanded ? 'auto' : '200px',
          maxWidth: '600px',
          zIndex: draggingNode === node.id ? 50 : 10,
          cursor: draggingNode === node.id ? 'grabbing' : 'grab'
        }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
      >
        {/* Node Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 flex-none"
          style={{ backgroundColor: colors.bgHeader, borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Table size={14} style={{ color: colors.primary }} className="flex-none" />
            <span className="text-sm font-bold truncate" style={{ color: colors.text }}>{node.tableName}</span>
            {isLoading && <span className="text-[10px] animate-pulse" style={{ color: colors.warning }}>Loading...</span>}
            {!isLoading && <span className="text-[10px]" style={{ color: colors.textDim }}>({tableData?.rows?.length || 0})</span>}
          </div>
          <div className="flex items-center gap-1 flex-none ml-2">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(); }} 
              className="p-1 hover:bg-white/10 rounded"
            >
              {node.expanded ? <Minimize2 size={12} style={{ color: colors.textMuted }} /> : <Maximize2 size={12} style={{ color: colors.textMuted }} />}
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if(confirm(`Delete table '${node.tableName}'?`)) deleteTableMutation.mutate({ tableName: node.tableName }); 
              }} 
              className="p-1 hover:bg-red-900/50 rounded"
            >
              <Trash2 size={12} style={{ color: colors.textMuted }} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); removeNode(); }} 
              className="p-1 hover:bg-white/10 rounded"
              title="Close Node"
            >
              <X size={12} style={{ color: colors.textMuted }} />
            </button>
          </div>
        </div>

        {/* Columns Header (Connection Points) */}
        {node.expanded && (
          <div className="flex overflow-x-auto overflow-y-hidden flex-none scrollbar-hide" style={{ backgroundColor: colors.bgHeader, borderBottom: `1px solid ${colors.border}` }}>
            {columns.map(col => (
              <div
                key={col}
                className="px-3 py-2 text-xs font-bold border-r cursor-pointer hover:bg-white/10 flex items-center gap-2 whitespace-nowrap group transition-colors"
                style={{ 
                  borderColor: colors.border, 
                  color: drawingConnection?.sourceColumn === col && drawingConnection?.sourceNodeId === node.id ? colors.accent : colors.textMuted,
                  minWidth: '100px' 
                }}
                onClick={(e) => { e.stopPropagation(); startConnection(node.id, node.tableName, col); }}
                onMouseUp={(e) => { e.stopPropagation(); completeConnection(node.id, node.tableName, col); }}
                title={`Click to connect '${col}'`}
              >
                {col}
                <div className={`w-2 h-2 rounded-full ${drawingConnection ? 'bg-yellow-500 animate-pulse' : 'bg-transparent group-hover:bg-blue-500'}`} />
              </div>
            ))}
          </div>
        )}

        {/* Data Rows */}
        {node.expanded && (
          <div className="overflow-auto max-h-[300px] bg-[#0a0e14] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {isLoading ? (
               <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  {tableData?.rows.slice(0, 10).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 border-b border-[#2d3748] last:border-0">
                      {columns.map(col => (
                        <td key={col} className="px-3 py-2 border-r border-[#2d3748] min-w-[100px] max-w-[200px] truncate text-gray-400">
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {tableData?.rows.length === 0 && (
                      <tr><td colSpan={columns.length} className="p-4 text-center text-gray-500">No data</td></tr>
                  )}
                </tbody>
              </table>
            )}
            {tableData && tableData.rows.length > 10 && (
                 <div className="p-2 text-center text-[10px] text-gray-500 bg-[#13171f] sticky bottom-0 border-t border-[#2d3748]">
                    Showing 10 of {tableData.rows.length} rows
                 </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- SVG CONNECTIONS OVERLAY ---
  const ConnectionLines = useMemo(() => {
    return (
      <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 1 }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
          </marker>
        </defs>
        {connections.map(conn => {
          const sourceNode = nodes.find(n => n.id === conn.from.nodeId);
          const targetNode = nodes.find(n => n.id === conn.to.nodeId);
          if (!sourceNode || !targetNode) return null;
          
          // Simple layout calculation: assume connection points are top-center relative to node for now
          // In a real app, we'd calculate exact column positions. 
          // Here we just connect the node centers with offset to simulate column linking visually
          const x1 = sourceNode.position.x + 50;
          const y1 = sourceNode.position.y + 60;
          const x2 = targetNode.position.x + 50;
          const y2 = targetNode.position.y + 60;
          
          return (
            <g key={conn.id}>
              <path 
                d={`M ${x1} ${y1} C ${x1 + 50} ${y1 + 50}, ${x2 - 50} ${y2 - 50}, ${x2} ${y2}`}
                fill="none"
                stroke={colors.accent}
                strokeWidth="2"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
                className="animate-[dash_1s_linear_infinite]"
              />
              <circle cx={x1} cy={y1} r="3" fill={colors.accent} />
              <circle cx={x2} cy={y2} r="3" fill={colors.accent} />
            </g>
          );
        })}
        {drawingConnection && draggingNode === null && (
           // Render temporary line if we knew mouse pos, skipped for simplicity in this React version
           // but could attach to mousemove
           null
        )}
      </svg>
    );
  }, [connections, nodes]);

  // --- RENDER ---
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans select-none" style={{ backgroundColor: colors.bg }}>
      
      {/* HEADER */}
      <div 
        className="h-14 flex items-center justify-between px-4 border-b shrink-0"
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database size={20} style={{ color: colors.primary }} />
            <span className="text-lg font-bold tracking-tight" style={{ color: colors.text }}>AI DATA EXPLORER</span>
          </div>
          <div className="h-6 w-px bg-gray-700 mx-2" />
          <div className="flex gap-1">
             <button 
               onClick={() => setActiveTab('data')}
               className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'data' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
               CANVAS
             </button>
             <button 
               onClick={() => setActiveTab('assets')}
               className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'assets' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
               ASSETS
             </button>
             <button 
               onClick={() => setActiveTab('dashboard')}
               className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-green-500/20 text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
               DASHBOARD
             </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {activeTab === 'data' && (
                <div className="relative">
                    <button 
                    onClick={() => setShowTableSelector(!showTableSelector)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/20"
                    >
                    <Plus size={14} /> ADD NODE
                    </button>
                    
                    {showTableSelector && (
                        <div className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl z-50 p-2">
                            <button 
                                onClick={handleCreateNewTable}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-green-400 hover:bg-zinc-800 rounded mb-2 border border-dashed border-zinc-700"
                            >
                                + Create New Empty Table
                            </button>
                            <div className="text-[10px] font-bold text-gray-500 px-2 mb-1">EXISTING TABLES</div>
                            {allTables?.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => addTableNode(t.name)}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800 rounded flex items-center gap-2"
                                >
                                    <Table size={12} /> {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <button 
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="flex items-center gap-2 px-4 py-1.5 rounded font-bold text-xs animate-pulse bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30"
            >
            <Sparkles size={14} /> AI ASSISTANT {connections.length > 0 && `(${connections.length})`}
            </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* TAB: DATA CANVAS */}
        {activeTab === 'data' && (
          <div 
             className="absolute inset-0 overflow-auto bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-100" 
             ref={canvasRef}
             style={{ backgroundSize: '200px', backgroundColor: colors.bg }}
          >
             {/* Grid Pattern Background */}
             <div className="absolute inset-0 pointer-events-none" 
                  style={{ 
                    backgroundImage: `linear-gradient(${colors.border} 1px, transparent 1px), linear-gradient(90deg, ${colors.border} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    opacity: 0.05
                  }} 
             />

             <div className="min-w-[3000px] min-h-[3000px] relative">
                {ConnectionLines}
                {nodes.map(node => <TableNode key={node.id} node={node} />)}
                
                {nodes.length === 0 && (
                    <div className="absolute top-1/4 left-1/4 pointer-events-none opacity-20">
                        <ArrowRight size={100} className="text-blue-500 mb-4 ml-10" />
                        <h1 className="text-4xl font-bold text-white">Add a Node to Start</h1>
                    </div>
                )}
             </div>
          </div>
        )}

        {/* TAB: ASSETS */}
        {activeTab === 'assets' && (
          <div className="h-full flex bg-black">
            <div className="w-64 border-r border-zinc-800 p-4 bg-zinc-900">
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Libraries</h3>
                <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded bg-blue-900/20 text-blue-400 text-xs font-bold"><FolderOpen size={14} /> Documents</button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 text-gray-400 text-xs font-bold"><Image size={14} /> Images</button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 text-gray-400 text-xs font-bold"><Film size={14} /> Videos</button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 text-gray-400 text-xs font-bold"><FileAudio size={14} /> Audio</button>
                </div>
            </div>
            <div className="flex-1 bg-black p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg h-full overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                        <span className="font-bold text-gray-200 text-sm">File System</span>
                        <div className="flex gap-2">
                             <button className="p-1 hover:bg-zinc-800 rounded"><Upload size={14} className="text-gray-400" /></button>
                             <button className="p-1 hover:bg-zinc-800 rounded"><Search size={14} className="text-gray-400" /></button>
                        </div>
                    </div>
                    <div className="flex-1 p-2">
                         {/* Reuse existing FileExplorer component */}
                         <FileExplorer 
                            files={[]} // You would wire this to the real file store
                            onSelect={(path) => alert(`Selected: ${path}`)}
                            className="h-full"
                         /> 
                         {/* Fallback visual if empty */}
                         <div className="flex flex-col items-center justify-center h-full text-zinc-700">
                             <Archive size={48} className="mb-2 opacity-20" />
                             <p className="text-xs">File System Integration Ready</p>
                         </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
            <div className="h-full bg-black p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Widget 1 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ActivityIcon size={100} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">System Status</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-green-400">98%</span>
                            <span className="text-xs text-gray-500 mb-2">Operational</span>
                        </div>
                    </div>
                    
                    {/* Widget 2: SQL Shortcuts */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 col-span-2">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                         <div className="flex gap-4">
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-2">
                                <Zap size={14} /> Run Cleanup Job
                            </button>
                            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold flex items-center gap-2">
                                <Database size={14} /> Backup All
                            </button>
                         </div>
                    </div>

                    {/* Widget 3: Visual Query Builder Embed */}
                    <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden h-[500px] flex flex-col">
                        <div className="p-3 border-b border-zinc-800 bg-zinc-950">
                            <span className="text-xs font-bold text-purple-400">VISUAL QUERY BUILDER</span>
                        </div>
                        <VisualQueryBuilder 
                            activeTable={nodes[0]?.tableName || ''} 
                            onExecute={() => {}} 
                            onSaveTable={() => {}} 
                            isLoading={false}
                        />
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* AI PANEL (Bottom Sheet) */}
      {showAIPanel && (
        <div 
          className="absolute bottom-0 left-0 right-0 border-t transition-transform duration-300 transform translate-y-0"
          style={{ 
             backgroundColor: colors.bgHeader, 
             borderColor: colors.border, 
             height: '320px',
             boxShadow: `0 -10px 40px ${colors.bg}`,
             zIndex: 100
          }}
        >
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: colors.warning }} className="animate-pulse" />
                <span className="font-bold text-sm" style={{ color: colors.text }}>AI DATA ALIGNMENT ASSISTANT</span>
              </div>
              <button onClick={() => setShowAIPanel(false)} className="hover:bg-white/10 p-1 rounded">
                <X size={16} style={{ color: colors.textMuted }} />
              </button>
            </div>

            {connections.length > 0 && (
              <div className="mb-3 p-2 rounded flex gap-2 overflow-x-auto" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
                {connections.map(conn => (
                  <div key={conn.id} className="flex-none px-2 py-1 rounded text-[10px] flex items-center gap-1 font-mono" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>
                    <Link2 size={10} />
                    {conn.from.tableName}.{conn.from.column} <ArrowRight size={8}/> {conn.to.tableName}.{conn.to.column}
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 flex gap-4">
                <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe how to align this data..."
                className="flex-1 p-3 rounded outline-none resize-none text-sm font-mono focus:border-blue-500 transition-colors"
                style={{ 
                    backgroundColor: colors.bg, 
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                }}
                />
                <div className="w-64 flex flex-col gap-2">
                    <button 
                        onClick={() => alert(`Simulating AI Execution:\n\n${aiPrompt}`)}
                        className="flex-1 rounded font-bold text-xs flex flex-col items-center justify-center gap-2 hover:brightness-110 transition-all"
                        style={{ backgroundColor: colors.primary, color: 'white' }}
                    >
                        <Zap size={24} />
                        EXECUTE ALIGNMENT
                    </button>
                    <button 
                         onClick={() => { setConnections([]); setAiPrompt(''); }}
                        className="h-8 rounded font-bold text-xs hover:bg-white/10 transition-all border border-zinc-700 text-zinc-400"
                    >
                        CLEAR CONTEXT
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 text-[10px]" style={{ color: colors.textDim }}>
              <span>{connections.length} active relationships defined</span>
              <span>Model: Claude-3.5-Sonnet (Optimized for SQL)</span>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <div 
        className="h-6 flex items-center justify-between px-4 text-[9px] border-t shrink-0"
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border, color: colors.textMuted }}
      >
        <div className="flex items-center gap-4">
          <span>{nodes.length} Active Nodes</span>
          <span>{connections.length} Data Links</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }}></div>
            System Ready
          </span>
        </div>
        <div>
          {activeTab === 'data' ? 'Drag nodes to organize • Click column headers to link' : 'Workspace Mode'}
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const ActivityIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

export default AdaptiveDataExplorer;