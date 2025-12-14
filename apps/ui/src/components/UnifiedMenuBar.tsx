import { Link, useLocation } from 'react-router-dom';
import { 
  Settings, LayoutGrid, Database, Users, 
  Mic, User, Cpu, ChevronDown 
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme.js';

export const UnifiedMenuBar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const [voiceActive, setVoiceActive] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className="flex-none w-full h-12 border-b border-zinc-800 bg-[#09090b] text-white flex items-center justify-between px-4 z-50 shadow-md"
    >
      {/* LEFT: VOICE & COMMAND */}
      <div className="flex items-center gap-4 flex-1">
        <button 
           className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${voiceActive ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
           onClick={() => setVoiceActive(!voiceActive)}
        >
           <Mic size={14} />
           <span className="text-[10px] font-bold tracking-widest">VOICE</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
           <User size={14} className="text-purple-400" />
           <div className="flex flex-col leading-none">
              <span className="text-[8px] text-zinc-500 uppercase font-bold">Talking To</span>
              <span className="text-[10px] font-bold text-zinc-200">Lead Developer</span>
           </div>
           <ChevronDown size={12} className="text-zinc-600 ml-1" />
        </div>
      </div>

      {/* CENTER: NAVIGATION (Centered) */}
      <div className="flex items-center justify-center gap-1 flex-1">
        {[
          { path: '/workspace', icon: LayoutGrid, label: 'Work' },
          { path: '/creator', icon: Users, label: 'Creator' },
          { path: '/supernodes', icon: Database, label: 'Refinery' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-[10px] tracking-widest transition-all ${
              isActive(item.path) 
                ? 'bg-zinc-100 text-black' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </Link>
        ))}
      </div>

      {/* RIGHT: STATS */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="flex items-center gap-2 text-zinc-500" title="Context Usage">
           <Cpu size={14} />
           <span className="text-[10px] font-mono">14%</span>
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <button className="text-zinc-500 hover:text-white transition-colors">
           <Settings size={16} />
        </button>
      </div>
    </div>
  );
};