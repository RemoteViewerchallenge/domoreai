import React, { memo, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Database, Globe, Server, AlertCircle, 
  Maximize2, Minimize2, Columns, Sidebar, Play, Bot 
} from 'lucide-react';
import { DataCapability } from './capabilities/DataCapability.js';
import { ApiCapability } from './capabilities/ApiCapability.js';
import { AiButton } from '../../../components/ui/AiButton.js';

export interface SuperNodeData {
  label?: string;
  type: 'data' | 'api' | 'browser';
  error?: string;
  stats?: { rows?: number; status?: string };
}

const SuperNode = ({ data, id, selected }: NodeProps<SuperNodeData>) => {
  // View States: 'hud' (Tiny), 'single' (Focused), 'book' (Split)
  const [viewMode, setViewMode] = useState<'hud' | 'single' | 'book'>('hud');
  
  // Auto-Naming Logic
  const nodeLabel = useMemo(() => {
    if (data.label) return data.label;
    return `${data.type.toUpperCase()}_${id.slice(-4)}`;
  }, [data.label, data.type, id]);

  // Dimensions (CSS Classes for performance)
  const sizeClass = {
    hud: 'w-[240px] h-[36px]',
    single: 'w-[500px] h-[400px]',
    book: 'w-[900px] h-[500px]'
  }[viewMode];

  // Dynamic Border
  const borderClass = data.error 
    ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
    : selected 
      ? 'border-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary-glow)]' 
      : 'border-zinc-800 hover:border-zinc-700';

  return (
    <div 
      className={`relative bg-zinc-950 rounded-sm border-2 transition-all duration-100 ease-linear flex flex-col overflow-hidden ${sizeClass} ${borderClass}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!selected) return;
        if (e.key === ' ' && e.ctrlKey) { e.preventDefault(); setViewMode(prev => prev === 'hud' ? 'single' : 'hud'); }
      }}
    >
      {/* --- HUD HEADER (Always Visible) --- */}
      <div 
        className="flex-none h-[32px] flex items-center justify-between px-2 bg-zinc-950 border-b border-zinc-900 cursor-pointer group"
        onDoubleClick={() => setViewMode(prev => prev === 'hud' ? 'single' : 'hud')}
      >
        {/* Left: Identity */}
        <div className="flex items-center gap-2 overflow-hidden">
          {data.type === 'data' && <Database size={12} className="text-[var(--color-primary)]" />}
          {data.type === 'api' && <Server size={12} className="text-[var(--color-secondary)]" />}
          
          <span className="font-mono text-[10px] font-bold text-zinc-100 truncate">
            {nodeLabel}
          </span>
          
          {/* Condensed Stats */}
          {viewMode === 'hud' && (
             <span className="text-[9px] text-zinc-600 font-mono ml-2 border-l border-zinc-800 pl-2">
               {data.stats?.rows ? `${data.stats.rows} ROWS` : data.stats?.status || 'IDLE'}
             </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {data.error && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
          
          <AiButton source={{ type: 'coorp-node', nodeId: id }} defaultRoleId="architect" />

          {viewMode !== 'hud' && (
            <button 
              onClick={() => setViewMode(prev => prev === 'book' ? 'single' : 'book')} 
              className="p-1 hover:text-[var(--color-primary)] text-zinc-600"
              title={viewMode === 'single' ? "Open Book View" : "Close Book View"}
            >
              {viewMode === 'single' ? <Columns size={10} /> : <Sidebar size={10} />}
            </button>
          )}
          <button 
            onClick={() => setViewMode(prev => prev === 'hud' ? 'single' : 'hud')} 
            className="p-1 hover:text-[var(--color-primary)] text-zinc-600"
          >
            {viewMode === 'hud' ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
          </button>
        </div>
      </div>

      {/* --- BODY (Conditional Render) --- */}
      {viewMode !== 'hud' && (
        <div className="flex-1 flex min-h-0 bg-zinc-950">
          
          {/* Page 1: The Main Capability */}
          <div className="flex-1 min-w-0 flex flex-col">
             {data.type === 'data' && <DataCapability error={data.error} />}
             {data.type === 'api' && <ApiCapability error={data.error} />}
          </div>

          {/* Page 2: The "Book" Side (AI Context / Logs) */}
          {viewMode === 'book' && (
            <div className="flex-1 min-w-0 border-l border-zinc-800 bg-zinc-950/50 flex flex-col">
               <div className="h-6 border-b border-zinc-800 px-2 flex items-center justify-between bg-zinc-900/30">
                 <span className="text-[9px] text-zinc-500 uppercase font-bold">AI Oversight</span>
                 <Bot size={10} className="text-[var(--color-primary)]"/>
               </div>
               <div className="flex-1 p-2 font-mono text-[10px] text-zinc-400 overflow-auto">
                 <div className="opacity-50">// Agent is observing {nodeLabel}...</div>
                 <div className="text-[var(--color-success)] mt-2">✓ Schema validated</div>
                 <div className="text-zinc-600 mt-1">Analyzing row distribution...</div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!w-1.5 !h-6 !rounded-sm !bg-zinc-800 !border-none !-left-1.5 hover:!bg-[var(--color-primary)] transition-colors" />
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-6 !rounded-sm !bg-zinc-800 !border-none !-right-1.5 hover:!bg-[var(--color-primary)] transition-colors" />
    </div>
  );
};

export default memo(SuperNode);
