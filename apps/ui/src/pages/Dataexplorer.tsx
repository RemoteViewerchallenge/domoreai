import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, Table, Plus, Minimize2, Maximize2, 
  Sparkles, Link2, Download, Upload, Trash2, 
  Film, FileAudio, FileText, Image, Zap, X, Save, FolderOpen,
  Code, Layout as LayoutIcon, Grid, Eye, PlayCircle, FileCode, Archive
} from 'lucide-react';
import { Layout } from '../components/Layout.js';
import { AIContextButton } from '../components/AIContextButton.js';

const FutureDataExplorer = () => {
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

  const [activeTab, setActiveTab] = useState('data');
  const [nodes, setNodes] = useState([
    {
      id: 'node1',
      title: 'Providers',
      position: { x: 50, y: 100 },
      expanded: true,
      data: [
        { id: 1, provider: 'OpenRouter', context: 'Multi-model routing', tokens: 128000, cost: 0.002 },
        { id: 2, provider: 'Grok', context: 'X.AI advanced', tokens: 131000, cost: 0.003 },
        { id: 3, provider: 'Mistral', context: 'European AI', tokens: 32000, cost: 0.001 },
      ]
    },
    {
      id: 'node2',
      title: 'Models',
      position: { x: 600, y: 100 },
      expanded: true,
      data: [
        { id: 1, name: 'GPT-4', context: '', max_tokens: 128000, provider_id: null },
        { id: 2, name: 'Claude', context: '', max_tokens: 200000, provider_id: null },
        { id: 3, name: 'Gemini', context: '', max_tokens: 1000000, provider_id: null },
      ]
    },
  ]);

  const [assets] = useState({
    images: [
      { name: 'logo.png', size: '45KB', preview: '🖼️', path: '/assets/logo.png' },
      { name: 'banner.jpg', size: '230KB', preview: '🖼️', path: '/assets/banner.jpg' },
      { name: 'icon.svg', size: '12KB', preview: '🖼️', path: '/assets/icon.svg' },
    ],
    videos: [
      { name: 'tutorial.mp4', size: '45MB', duration: '5:32', path: '/videos/tutorial.mp4' },
      { name: 'demo.webm', size: '22MB', duration: '2:15', path: '/videos/demo.webm' },
    ],
    documents: [
      { name: 'README.md', size: '8KB', type: 'markdown', path: '/docs/README.md' },
      { name: 'spec.pdf', size: '2.3MB', type: 'pdf', path: '/docs/spec.pdf' },
      { name: 'notes.txt', size: '1KB', type: 'text', path: '/docs/notes.txt' },
    ],
    code: [
      { name: 'App.tsx', size: '12KB', language: 'typescript', path: '/src/App.tsx' },
      { name: 'utils.js', size: '4KB', language: 'javascript', path: '/src/utils.js' },
      { name: 'styles.css', size: '3KB', language: 'css', path: '/src/styles.css' },
    ],
    audio: [
      { name: 'podcast.mp3', size: '45MB', duration: '32:15', path: '/audio/podcast.mp3' },
      { name: 'voicenote.wav', size: '8MB', duration: '4:22', path: '/audio/voicenote.wav' },
    ]
  });

  const [connections, setConnections] = useState([]);
  const [drawingConnection, setDrawingConnection] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const canvasRef = useRef(null);

  const handleMouseDown = (e, nodeId) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    const node = nodes.find(n => n.id === nodeId);
    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingNode) {
        setNodes(nodes.map(n => 
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
  }, [draggingNode, dragOffset, nodes]);

  const startConnection = (nodeId, column) => {
    setDrawingConnection({ sourceNode: nodeId, sourceColumn: column });
  };

  const completeConnection = (nodeId, column) => {
    if (drawingConnection && drawingConnection.sourceNode !== nodeId) {
      const newConnection = {
        id: `conn-${Date.now()}`,
        from: { nodeId: drawingConnection.sourceNode, column: drawingConnection.sourceColumn },
        to: { nodeId, column }
      };
      setConnections([...connections, newConnection]);
      
      const sourceNode = nodes.find(n => n.id === drawingConnection.sourceNode);
      const targetNode = nodes.find(n => n.id === nodeId);
      const suggestion = `Extract ${drawingConnection.sourceColumn} from ${sourceNode.title} to ${column} in ${targetNode.title}`;
      setAiPrompt(prev => prev ? `${prev}\n${suggestion}` : suggestion);
      setShowAIPanel(true);
    }
    setDrawingConnection(null);
  };

  const toggleExpand = (nodeId) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, expanded: !n.expanded } : n));
  };

  const addNewTable = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      title: 'New Table',
      position: { x: 100, y: 200 },
      expanded: true,
      data: [{ id: 1, column1: 'value1', column2: 'value2' }]
    };
    setNodes([...nodes, newNode]);
  };

  const saveNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const dataStr = JSON.stringify(node, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${node.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const TableNode = ({ node }) => {
    const columns = node.data && node.data.length > 0 ? Object.keys(node.data[0]) : [];
    
    return (
      <div 
        className="absolute rounded-lg overflow-hidden border-2 transition-all select-none"
        style={{
          left: node.position.x,
          top: node.position.y,
          backgroundColor: colors.bgCard,
          borderColor: draggingNode === node.id ? colors.accent : colors.primary,
          boxShadow: `0 0 20px ${colors.primary}30`,
          width: node.expanded ? 'auto' : 'max-content',
          minWidth: '200px',
          cursor: draggingNode === node.id ? 'grabbing' : 'grab'
        }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
      >
        <div 
          className="flex items-center justify-between px-3 py-2"
          style={{ backgroundColor: colors.bgHeader, borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2">
            <Table size={14} style={{ color: colors.primary }} />
            <span className="text-sm font-bold" style={{ color: colors.text }}>{node.title}</span>
            <span className="text-[10px]" style={{ color: colors.textDim }}>({node.data.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); saveNode(node.id); }} 
              className="p-1 hover:bg-white/10 rounded"
              title="Save Table"
            >
              <Save size={12} style={{ color: colors.accent }} />
            </button>
            <AIContextButton context={`Table: ${node.title}`} size="sm" />
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} 
              className="p-1 hover:bg-white/10 rounded"
            >
              {node.expanded ? <Minimize2 size={12} style={{ color: colors.textMuted }} /> : <Maximize2 size={12} style={{ color: colors.textMuted }} />}
            </button>
            <button className="p-1 hover:bg-white/10 rounded">
              <Trash2 size={12} style={{ color: colors.textMuted }} />
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto" style={{ backgroundColor: colors.bgHeader, borderBottom: `1px solid ${colors.border}` }}>
          {columns.map(col => (
            <div
              key={col}
              className="px-3 py-2 text-xs font-bold border-r cursor-pointer hover:bg-white/10 flex items-center gap-1 whitespace-nowrap"
              style={{ borderColor: colors.border, color: colors.textMuted, minWidth: '120px' }}
              onClick={(e) => { e.stopPropagation(); startConnection(node.id, col); }}
              onMouseUp={(e) => { e.stopPropagation(); completeConnection(node.id, col); }}
              title="Click to connect"
            >
              {col}
              <Link2 size={10} style={{ color: colors.accent }} className="opacity-50 hover:opacity-100" />
            </div>
          ))}
        </div>

        {node.expanded && (
          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
            <table className="w-full text-xs" style={{ color: colors.text }}>
              <tbody>
                {node.data.map((row, i) => (
                  <tr key={i} className="hover:bg-white/5" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 border-r" style={{ borderColor: colors.border, minWidth: '120px' }}>
                        <input 
                          className="w-full bg-transparent outline-none text-xs"
                          defaultValue={row[col]}
                          style={{ color: colors.text }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const AssetLibrary = () => {
    const [selectedCategory, setSelectedCategory] = useState('images');
    
    const categories = [
      { id: 'images', icon: Image, label: 'Images' },
      { id: 'videos', icon: Film, label: 'Videos' },
      { id: 'documents', icon: FileText, label: 'Docs' },
      { id: 'code', icon: Code, label: 'Code' },
      { id: 'audio', icon: FileAudio, label: 'Audio' },
    ];

    const currentAssets = assets[selectedCategory] || [];

    return (
      <div className="h-full flex">
        <div className="w-48 border-r p-3 space-y-1" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <div className="text-xs font-bold mb-3" style={{ color: colors.textMuted }}>CATEGORIES</div>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all"
                style={{
                  backgroundColor: selectedCategory === cat.id ? colors.primary + '20' : 'transparent',
                  color: selectedCategory === cat.id ? colors.primary : colors.text,
                  border: `1px solid ${selectedCategory === cat.id ? colors.primary : 'transparent'}`
                }}
              >
                <Icon size={16} />
                {cat.label}
                <span className="ml-auto text-xs" style={{ color: colors.textDim }}>
                  {assets[cat.id].length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              {categories.find(c => c.id === selectedCategory)?.label}
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold" style={{ backgroundColor: colors.accent, color: 'white' }}>
              <Upload size={14} /> Upload
            </button>
            <AIContextButton context="Asset Library" size="sm" />
          </div>

          <div className="grid grid-cols-4 gap-4">
            {currentAssets.map((asset, i) => (
              <div
                key={i}
                className="rounded-lg overflow-hidden border cursor-pointer hover:border-opacity-100 transition-all group relative"
                style={{ backgroundColor: colors.bgCard, borderColor: colors.border + '50' }}
                onClick={() => setPreviewAsset(asset)}
              >
                <div className="aspect-video flex items-center justify-center text-4xl" style={{ backgroundColor: colors.bg }}>
                  {selectedCategory === 'images' && <Image size={48} style={{ color: colors.primary }} />}
                  {selectedCategory === 'videos' && <PlayCircle size={48} style={{ color: colors.accent }} />}
                  {selectedCategory === 'documents' && <FileText size={48} style={{ color: colors.warning }} />}
                  {selectedCategory === 'code' && <FileCode size={48} style={{ color: colors.secondary }} />}
                  {selectedCategory === 'audio' && <FileAudio size={48} style={{ color: colors.accent }} />}
                </div>
                
                <div className="p-3">
                  <div className="text-xs font-bold mb-1 truncate" style={{ color: colors.text }}>{asset.name}</div>
                  <div className="text-[10px]" style={{ color: colors.textDim }}>
                    {asset.size}
                    {asset.duration && ` • ${asset.duration}`}
                    {asset.language && ` • ${asset.language}`}
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button className="p-2 rounded" style={{ backgroundColor: colors.primary }}>
                    <Eye size={16} style={{ color: 'white' }} />
                  </button>
                  <button className="p-2 rounded" style={{ backgroundColor: colors.accent }}>
                    <Download size={16} style={{ color: 'white' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="h-full p-6 overflow-auto">
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-lg" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
            <Grid size={18} style={{ color: colors.primary }} />
            Data Relationships
            <AIContextButton context="Data Relationships" size="sm" />
          </h3>
          <div className="space-y-3">
            {connections.map(conn => (
              <div key={conn.id} className="p-3 rounded flex items-center gap-3" style={{ backgroundColor: colors.bg }}>
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: colors.text }}>
                    {nodes.find(n => n.id === conn.from.nodeId)?.title} to {nodes.find(n => n.id === conn.to.nodeId)?.title}
                  </div>
                  <div className="text-[10px]" style={{ color: colors.textDim }}>
                    {conn.from.column} to {conn.to.column}
                  </div>
                </div>
                <Link2 size={14} style={{ color: colors.accent }} />
              </div>
            ))}
            {connections.length === 0 && (
              <div className="text-center py-8" style={{ color: colors.textDim }}>
                No relationships yet. Draw connections in Data tab.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
            <Sparkles size={18} style={{ color: colors.warning }} />
            AI Features
          </h3>
          <div className="space-y-2">
            <button className="w-full p-3 rounded text-left hover:bg-white/5" style={{ backgroundColor: colors.bg }}>
              <div className="text-sm font-bold" style={{ color: colors.text }}>Auto-generate UI Components</div>
              <div className="text-xs mt-1" style={{ color: colors.textDim }}>Create forms, charts, and widgets from your data</div>
            </button>
            <button className="w-full p-3 rounded text-left hover:bg-white/5" style={{ backgroundColor: colors.bg }}>
              <div className="text-sm font-bold" style={{ color: colors.text }}>Data Validation Rules</div>
              <div className="text-xs mt-1" style={{ color: colors.textDim }}>AI suggests constraints and validation logic</div>
            </button>
            <button className="w-full p-3 rounded text-left hover:bg-white/5" style={{ backgroundColor: colors.bg }}>
              <div className="text-sm font-bold" style={{ color: colors.text }}>Relationship Suggestions</div>
              <div className="text-xs mt-1" style={{ color: colors.textDim }}>Discover potential connections between tables</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout activePage="data">
      <div className="h-full w-full flex flex-col overflow-hidden font-sans" style={{ backgroundColor: colors.bg }}>
      
      <div 
        className="h-14 flex items-center justify-between px-4 border-b"
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database size={20} style={{ color: colors.primary }} />
            <span className="text-lg font-bold" style={{ color: colors.primary }}>AI DATA EXPLORER</span>
          </div>
        </div>

        <button 
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="flex items-center gap-2 px-4 py-2 rounded font-bold text-xs animate-pulse"
          style={{ backgroundColor: colors.primary, color: 'white', boxShadow: `0 0 20px ${colors.primary}50` }}
        >
          <Sparkles size={14} /> AI ASSISTANT {connections.length > 0 && `(${connections.length})`}
        </button>
      </div>

      <div className="flex-none flex items-center gap-1 px-4 py-2 border-b" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
        {[
          { id: 'data', icon: Database, label: 'Data Canvas' },
          { id: 'assets', icon: FolderOpen, label: 'Asset Library' },
          { id: 'dashboard', icon: Layout, label: 'Dashboard' }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? colors.primary : 'transparent',
                color: activeTab === tab.id ? 'white' : colors.textMuted,
                border: `1px solid ${activeTab === tab.id ? colors.primary : 'transparent'}`
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}

        {activeTab === 'data' && (
          <button 
            onClick={addNewTable}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold ml-auto"
            style={{ backgroundColor: colors.accent, color: 'white' }}
          >
            <Plus size={14} /> NEW TABLE
          </button>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        
        {activeTab === 'data' && (
          <>
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              {connections.map(conn => {
                const sourceNode = nodes.find(n => n.id === conn.from.nodeId);
                const targetNode = nodes.find(n => n.id === conn.to.nodeId);
                if (!sourceNode || !targetNode) return null;
                
                const x1 = sourceNode.position.x + 100;
                const y1 = sourceNode.position.y + 60;
                const x2 = targetNode.position.x + 100;
                const y2 = targetNode.position.y + 60;
                
                return (
                  <g key={conn.id}>
                    <line 
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={colors.accent}
                      strokeWidth="3"
                      strokeDasharray="8,4"
                    />
                    <circle cx={x1} cy={y1} r="6" fill={colors.accent} />
                    <circle cx={x2} cy={y2} r="6" fill={colors.accent} />
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-0 overflow-auto" style={{ zIndex: 2 }} ref={canvasRef}>
              <div style={{ minWidth: '2000px', minHeight: '2000px', position: 'relative' }}>
                {nodes.map(node => <TableNode key={node.id} node={node} />)}
              </div>
            </div>
          </>
        )}

        {activeTab === 'assets' && <AssetLibrary />}
        {activeTab === 'dashboard' && <Dashboard />}
      </div>

      {showAIPanel && (
        <div 
          className="absolute bottom-0 left-0 right-0 border-t"
          style={{ 
            backgroundColor: colors.bgHeader, 
            borderColor: colors.border,
            height: '300px',
            boxShadow: `0 -10px 40px ${colors.bg}`,
            zIndex: 20
          }}
        >
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: colors.warning }} className="animate-pulse" />
                <span className="font-bold text-sm" style={{ color: colors.text }}>AI DATA ALIGNMENT ASSISTANT</span>
              </div>
              <button onClick={() => setShowAIPanel(false)}>
                <X size={16} style={{ color: colors.textMuted }} />
              </button>
            </div>

            {connections.length > 0 && (
              <div className="mb-3 p-2 rounded" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}>
                <div className="text-xs font-bold mb-2" style={{ color: colors.textMuted }}>ACTIVE CONNECTIONS:</div>
                <div className="flex flex-wrap gap-2">
                  {connections.map(conn => (
                    <div key={conn.id} className="px-2 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>
                      <Link2 size={10} />
                      {conn.from.nodeId} to {conn.to.nodeId}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <textarea 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="AI will help you align data, suggest UI components, and optimize relationships...

Example prompts:
- Extract context from Providers to Models.context
- Create a dashboard widget for this data
- Suggest validation rules for max_tokens column"
              className="flex-1 p-3 rounded outline-none resize-none text-sm font-mono"
              style={{ 
                backgroundColor: colors.bg, 
                border: `1px solid ${colors.border}`,
                color: colors.text
              }}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="text-xs" style={{ color: colors.textDim }}>
                {connections.length} connections • {nodes.length} tables
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setAiPrompt(''); setConnections([]); }}
                  className="px-4 py-2 rounded text-xs font-bold"
                  style={{ backgroundColor: colors.bgCard, color: colors.textMuted, border: `1px solid ${colors.border}` }}
                >
                  CLEAR
                </button>
                <button 
                  onClick={() => alert(`AI Processing:\n${aiPrompt}`)}
                  className="flex items-center gap-2 px-6 py-2 rounded text-xs font-bold"
                  style={{ backgroundColor: colors.primary, color: 'white', boxShadow: `0 0 20px ${colors.primary}50` }}
                >
                  <Zap size={14} /> GENERATE & EXECUTE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewAsset && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }}
          onClick={() => setPreviewAsset(null)}
        >
          <div 
            className="max-w-4xl w-full rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.bgCard, border: `2px solid ${colors.primary}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <span className="font-bold" style={{ color: colors.text }}>{previewAsset.name}</span>
              <button onClick={() => setPreviewAsset(null)}>
                <X size={20} style={{ color: colors.textMuted }} />
              </button>
            </div>
            <div className="p-8 flex items-center justify-center" style={{ minHeight: '400px', backgroundColor: colors.bg }}>
              <div className="text-center">
                <Archive size={64} style={{ color: colors.primary }} className="mx-auto mb-4" />
                <div className="text-sm" style={{ color: colors.textMuted }}>Preview: {previewAsset.name}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="h-6 flex items-center justify-between px-4 text-[9px] border-t"
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border, color: colors.textMuted }}
      >
        <div className="flex items-center gap-4">
          <span>{nodes.length} Tables</span>
          <span>{connections.length} Connections</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }}></div>
            AI Ready
          </span>
        </div>
        <div>
          Drag nodes • Click headers to connect • {activeTab === 'data' ? 'Drawing connections...' : activeTab === 'assets' ? 'Browse & organize files' : 'Build relationships'}
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default FutureDataExplorer;