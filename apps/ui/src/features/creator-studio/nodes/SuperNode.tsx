import React, { memo, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { 
  Database, Globe, Server, Terminal, Sparkles, 
  Maximize2, Minimize2, X
} from 'lucide-react';
import { DataCapability } from './capabilities/DataCapability.js';
import { ApiCapability } from './capabilities/ApiCapability.js';
import { TerminalCapability } from './capabilities/TerminalCapability.js';
import { BrowserCard } from '../../../components/BrowserCard.js';
import { CardAgentPrompt } from '../../../components/work-order/CardAgentPrompt.js';

// The Universal State
export interface SuperNodeData {
  label?: string;
  defaultView?: 'data' | 'api' | 'terminal' | 'browser';
  department?: 'backend' | 'frontend' | 'data' | 'devops'; // Controls color
  stats?: { rows?: number; status?: string };
}

const SuperNode = ({ data, id, selected }: NodeProps<SuperNodeData>) => {
  // 1. Capabilities (All present in every node)
  const [activeView, setActiveView] = useState<'data' | 'api' | 'terminal' | 'browser'>(data.defaultView || 'data');
  const [viewMode, setViewMode] = useState<'hud' | 'window'>('hud');
  const [aiMode, setAiMode] = useState(false); 

  // 2. Department/Team Coloring Logic
  const deptColor = useMemo(() => {
    if (activeView === 'data') return 'border-purple-500 text-purple-500'; // Data Team
    if (activeView === 'api') return 'border-emerald-500 text-emerald-500'; // Backend Team
    if (activeView === 'terminal') return 'border-orange-500 text-orange-500'; // DevOps
    if (activeView === 'browser') return 'border-blue-500 text-blue-500'; // Frontend/QA
    return 'border-zinc-500 text-zinc-500';
  }, [activeView]);

  const nodeLabel = useMemo(() => data.label || `${activeView.toUpperCase()}_${id.slice(-4)}`, [data.label, activeView, id]);

  // 3. Dynamic sizing
  const sizeClass = viewMode === 'hud' ? 'w-[280px] h-[40px]' : 'w-[700px] h-[500px]';
  const zIndex = viewMode === 'window' ? 'z-50' : 'z-0'; // Pop to front when open

  return (
    <div 
      className={`relative bg-zinc-950 rounded-sm border-l-4 transition-all duration-200 flex flex-col shadow-2xl ${sizeClass} ${zIndex} ${deptColor.split(' ')[0]} ${selected ? 'ring-1 ring-white/20' : 'border-y-zinc-900 border-r-zinc-900'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!selected) return;
        if (e.key === ' ' && e.ctrlKey) { e.preventDefault(); setViewMode(prev => prev === 'hud' ? 'window' : 'hud'); }
      }}
    >
      {/* --- HEADER (The Switcher) --- */}
      <div 
        className="flex-none h-10 flex items-center justify-between px-3 bg-zinc-950 border-b border-zinc-900 group"
        onDoubleClick={() => setViewMode(prev => prev === 'hud' ? 'window' : 'hud')}
      >
        {/* Left: Identity */}
        <div className="flex items-center gap-3">
          {/* Icon inherits Department Color */}
          {activeView === 'data' && <Database size={14} className={deptColor.split(' ')[1]} />}
          {activeView === 'api' && <Server size={14} className={deptColor.split(' ')[1]} />}
          {activeView === 'terminal' && <Terminal size={14} className={deptColor.split(' ')[1]} />}
          {activeView === 'browser' && <Globe size={14} className={deptColor.split(' ')[1]} />}
          
          <span className="font-mono text-[11px] font-bold text-zinc-100 tracking-tight">
            {nodeLabel}
          </span>
        </div>

        {/* Right: The Universal Controls */}
        <div className="flex items-center gap-2">
          
          {/* View Switcher (Only visible when hovering or expanded) */}
          <div className={`flex gap-0.5 transition-opacity ${viewMode === 'hud' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
             <button onClick={() => setActiveView('data')} className={`p-1 rounded hover:bg-zinc-800 ${activeView === 'data' ? 'text-purple-400' : 'text-zinc-600'}`}><Database size={10}/></button>
             <button onClick={() => setActiveView('api')} className={`p-1 rounded hover:bg-zinc-800 ${activeView === 'api' ? 'text-emerald-400' : 'text-zinc-600'}`}><Server size={10}/></button>
             <button onClick={() => setActiveView('terminal')} className={`p-1 rounded hover:bg-zinc-800 ${activeView === 'terminal' ? 'text-orange-400' : 'text-zinc-600'}`}><Terminal size={10}/></button>
             <button onClick={() => setActiveView('browser')} className={`p-1 rounded hover:bg-zinc-800 ${activeView === 'browser' ? 'text-blue-400' : 'text-zinc-600'}`}><Globe size={10}/></button>
          </div>

          <div className="w-px h-3 bg-zinc-800" />

          {/* AI Takeover Button */}
          <button 
            onClick={() => { 
                setAiMode(!aiMode); 
                if(!aiMode) setViewMode('window'); // Auto-expand
            }}
            className={`p-1.5 rounded transition-all ${aiMode ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            title="Ask AI about this node"
          >
            <Sparkles size={12} />
          </button>

          {/* Window Toggle */}
          <button 
            onClick={() => setViewMode(prev => prev === 'hud' ? 'window' : 'hud')} 
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
          >
            {viewMode === 'hud' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      </div>

      {/* --- BODY --- */}
      {viewMode !== 'hud' && (
        <div className="flex-1 flex min-h-0 bg-zinc-950 relative">
          
          {/* CONTENT LAYER */}
          <div className={`flex-1 flex flex-col min-w-0 ${aiMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-200`}>
             {activeView === 'data' && <DataCapability />}
             {activeView === 'api' && <ApiCapability />}
             {activeView === 'terminal' && <TerminalCapability nodeId={id} />}
             {activeView === 'browser' && <div className="h-full w-full overflow-hidden"><BrowserCard /></div>}
          </div>

          {/* AI TAKEOVER LAYER (Overlays everything) */}
          {aiMode && (
            <div className="absolute inset-0 z-20 flex flex-col bg-zinc-950/95 backdrop-blur-md animate-in fade-in zoom-in-95">
               {/* AI Header */}
               <div className="flex-none p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-white"/>
                    <span className="text-xs font-bold text-white">AI Assistant</span>
                    <span className="text-[10px] text-zinc-500 px-2 border-l border-zinc-700">Context: {activeView.toUpperCase()}</span>
                  </div>
                  <button onClick={() => setAiMode(false)} className="text-zinc-500 hover:text-white"><X size={14}/></button>
               </div>
               
               {/* Chat / Prompt Area */}
               <div className="flex-1 p-4 flex flex-col justify-end">
                   {/* Here you would map over previous messages */}
                   <div className="mb-4 text-sm text-zinc-400 italic">
                      &quot;I&apos;m analyzing the {activeView} context for {nodeLabel}. What would you like me to do?&quot;
                   </div>
                   
                   {/* Prompt Input */}
                   <CardAgentPrompt 
                     cardId={id} 
                     cardContext={{ 
                        type: (activeView === 'data' || activeView === 'api') ? 'code' : activeView, 
                        currentPath: `/nodes/${id}`,
                        activeFile: null,
                        content: `User is viewing node: ${nodeLabel}`
                     }}
                     onSubmit={(p: string) => console.log('SuperNode AI:', p)} 
                     isLoading={false}
                   />
               </div>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!w-2 !h-8 !bg-zinc-800 !border-none hover:!bg-white transition-colors" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-8 !bg-zinc-800 !border-none hover:!bg-white transition-colors" />
    </div>
  );
};

export default memo(SuperNode);
