import { Link, useLocation } from 'react-router-dom';
import { 
  Settings, LayoutGrid, Users, Database,
  Mic, User, Cpu, ChevronDown, Layers 
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme.js';

export const UnifiedMenuBar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const [activeRole, setActiveRole] = useState('Lead Developer');
  const [voiceActive, setVoiceActive] = useState(false); // Python script listener state

  // Mock Token Stats
  const tokenTotal = 14205; 
  const contextMax = 32000;
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className="flex-none h-12 border-b-2 border-zinc-800 flex items-center justify-between px-4 z-50 bg-[#09090b] text-white select-none"
    >
      {/* --- LEFT: VOICE COMMAND --- */}
      <div className="flex items-center gap-4">
        <button 
           className={`flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all ${voiceActive ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
           onClick={() => setVoiceActive(!voiceActive)}
           title="Toggle Voice Input (Ctrl+Shift+Space)"
        >
           <Mic size={16} />
           <span className="text-xs font-bold tracking-widest">VOICE</span>
        </button>

        <div className="h-6 w-px bg-zinc-800" />

        {/* Role Selector */}
        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer group">
           <User size={14} className="text-purple-400" />
           <div className="flex flex-col leading-none">
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Speaking To</span>
              <span className="text-xs font-bold text-white group-hover:text-purple-300">{activeRole}</span>
           </div>
           <ChevronDown size={12} className="text-zinc-600 ml-2" />
        </div>
      </div>

      {/* --- CENTER: NAVIGATION --- */}
      <div className="flex items-center gap-2">
        {[
          { path: '/workspace', icon: LayoutGrid, label: 'Workspace' },
          { path: '/creator', icon: Users, label: 'Creator' },
          { path: '/supernodes', icon: Database, label: 'Refinery' }, // Data/API/Node Center
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-[10px] tracking-widest transition-all ${
              isActive(item.path) 
                ? 'bg-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <item.icon size={14} strokeWidth={3} />
            {item.label}
          </Link>
        ))}
      </div>

      {/* --- RIGHT: SYSTEM INTELLIGENCE --- */}
      <div className="flex items-center gap-4">
        
        {/* Local Embedding Control */}
        <button className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors" title="Local Ollama Index Status">
           <Layers size={14} />
           <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] font-bold">OLLAMA INDEX</span>
              <span className="text-[10px] text-emerald-500">READY</span>
           </div>
        </button>

        <div className="h-6 w-px bg-zinc-800" />

        {/* Live Token Counter */}
        <div className="flex items-center gap-2 text-zinc-400" title="Total Context Tokens">
           <Cpu size={14} />
           <div className="flex flex-col items-end leading-none w-20">
              <div className="flex justify-between w-full">
                 <span className="text-[9px] font-bold">CTX LOAD</span>
                 <span className="text-[9px] text-white font-mono">{Math.round((tokenTotal/contextMax)*100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                 <div className="h-full bg-purple-500" style={{ width: `${(tokenTotal/contextMax)*100}%` }} />
              </div>
           </div>
        </div>

        <button className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
           <Settings size={16} />
        </button>
      </div>
    </div>
  );
};