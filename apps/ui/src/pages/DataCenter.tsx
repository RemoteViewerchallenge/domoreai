import { useState } from 'react';
import { Network, Table } from 'lucide-react';
import { DatabaseBrowser } from '../components/DatabaseBrowser.js'; 
import { DbNodeCanvas } from '../components/DbNodeCanvas.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

export default function DataCenter() {
  const [view, setView] = useState<'table' | 'graph'>('table');

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      {/* Header */}
      <div className="flex-none h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
        <div className="flex items-center gap-4">
           <div className="flex flex-col">
             <span className="font-bold text-xl text-zinc-200 tracking-tight leading-none">DATA CENTER</span>
             <span className="text-[10px] text-zinc-500 font-mono">SQL / JSON / LAKE</span>
           </div>
           
           {/* View Switcher Tabs */}
           <div className="flex bg-black/40 rounded p-1 border border-zinc-800 ml-8">
              <button 
                onClick={() => setView('table')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${view === 'table' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Table size={14} /> Tables & Data
              </button>
              <button 
                onClick={() => setView('graph')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${view === 'graph' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Network size={14} /> Schema Graph
              </button>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
            <SuperAiButton contextId="datacenter_root" />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'table' ? (
            <DatabaseBrowser />
        ) : (
            <div className="w-full h-full bg-zinc-950">
               <DbNodeCanvas />
            </div>
        )}
      </div>
    </div>
  );
}