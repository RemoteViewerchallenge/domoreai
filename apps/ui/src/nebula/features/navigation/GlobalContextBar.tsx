import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Hammer, Palette, Rocket, Command, Sparkles, 
  Settings, Monitor, FolderGit2, X, Users, Database, Mic
} from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { SmartSwitch } from '../../../components/workspace/SmartSwitch.js';

interface GlobalContextBarProps {
    aiOpen?: boolean;
    setAiOpen?: (open: boolean) => void;
    onToggleTheme?: () => void;
    themeOpen?: boolean;
}

export const GlobalContextBar = ({ aiOpen, setAiOpen, onToggleTheme, themeOpen }: GlobalContextBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  // Context Detection
  const isBuilder = location.pathname.includes('/ui-studio');
  const isWorkbench = location.pathname === '/' || location.pathname === '/workbench';
  const isOrg = location.pathname === '/org-structure';
  const isVisualizer = location.pathname === '/visualizer' || location.pathname === '/code-visualizer';
  const isData = location.pathname === '/datacenter';
  const isVoice = location.pathname === '/voice-playground';
  const isSettings = location.pathname === '/settings';

  return (
    <div className="flex-none h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between select-none px-2 gap-2">
      
      {/* 1. NAVIGATION & TOOLS (Left) */}
      <div className="flex items-center gap-1 h-full">
          
          {/* Project Switcher */}
          <div className="relative">
              <NavButton 
                icon={FolderGit2} 
                active={projectMenuOpen} 
                onClick={() => setProjectMenuOpen(!projectMenuOpen)} 
                tooltip="Project Manager"
              />
              {projectMenuOpen && (
                 <div className="absolute top-9 left-0 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-sm py-1 z-50">
                    <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-muted)] uppercase">Active: {projectId || 'Default'}</div>
                    <div className="h-px bg-[var(--border-color)] my-1"/>
                    <button onClick={() => { navigate('/admin/projects'); setProjectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-[var(--bg-primary)]">All Projects</button>
                    <button onClick={() => { navigate('/admin/settings'); setProjectMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-[var(--bg-primary)]">Global Settings</button>
                 </div>
              )}
          </div>

          <div className="w-px h-4 bg-[var(--border-color)] mx-1" />

          {/* Primary Modes */}
          <NavButton 
            icon={Rocket} 
            active={isWorkbench} 
            onClick={() => navigate('/workbench')} 
            tooltip="Workbench (Cmd+1)" 
          />
          <NavButton 
            icon={Users} 
            active={isOrg} 
            onClick={() => navigate('/org-structure')} 
            tooltip="Agent DNA Lab (Cmd+2)" 
          />
          <NavButton 
            icon={Monitor} 
            active={isVisualizer} 
            onClick={() => navigate('/visualizer')} 
            tooltip="System Visualizer (Cmd+3)" 
          />
          <NavButton 
            icon={Database} 
            active={isData} 
            onClick={() => navigate('/datacenter')} 
            tooltip="Data Center (Cmd+4)" 
          />
          <NavButton 
            icon={Mic} 
            active={isVoice} 
            onClick={() => navigate('/voice-playground')} 
            tooltip="Voice Playground (Cmd+5)" 
          />
          <NavButton 
            icon={Hammer} 
            active={isBuilder} 
            onClick={() => navigate('/ui-studio/workbench')} 
            tooltip="Interface Studio (Nebula)" 
          />
          
          <div className="w-px h-4 bg-[var(--border-color)] mx-1" />

          {/* Tools */}
          <NavButton 
            icon={Palette} 
            active={themeOpen} 
            onClick={onToggleTheme || (() => {})} 
            tooltip="Theme Engine (Cmd+E)" 
          />
          <NavButton 
            icon={Settings} 
            active={isSettings} 
            onClick={() => navigate('/settings')} 
            tooltip="Constitution & Settings" 
          />
      </div>

      {/* 2. CONTEXT AWARE CENTER */}
      <div className="flex-1 flex justify-center items-center overflow-hidden gap-4">
         {isBuilder ? (
             <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full px-3 py-0.5">
                 <span className="text-[10px] font-bold text-[var(--color-primary)]">NEBULA BUILDER</span>
                 <span className="text-[9px] text-[var(--text-muted)] hidden sm:block">Drafting: {projectId}</span>
             </div>
         ) : (
            <>
                <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                    <Command size={10} />
                    <span className="text-[10px] font-mono tracking-widest uppercase">{projectId ?? 'COOPERATIVE OS'}</span>
                </div>
                {isWorkbench && <SmartSwitch />}
            </>
         )}
      </div>

      {/* 3. AI COMMAND CENTER (Right) */}
      <div className="flex items-center gap-2 h-full">
          {aiOpen ? (
              <div className="flex items-center w-96 h-8 bg-[var(--bg-primary)] border border-[var(--color-primary)] rounded shadow-lg animate-in slide-in-from-right-2 overflow-hidden">
                  <div className="w-8 h-full flex items-center justify-center text-[var(--color-primary)] bg-[var(--color-primary)]/10">
                       <Sparkles size={14} className="animate-pulse" />
                  </div>
                  <input 
                    id="nebula-ai-input"
                    autoFocus
                    placeholder="Command the engine..." 
                    className="flex-1 h-full bg-transparent border-none outline-none text-[11px] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono"
                    onBlur={() => setAiOpen?.(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            alert('Global Command: ' + e.currentTarget.value);
                            setAiOpen?.(false);
                        }
                        if (e.key === 'Escape') setAiOpen?.(false);
                    }}
                  />
                  <button onClick={() => setAiOpen?.(false)} className="px-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X size={12} />
                  </button>
              </div>
          ) : (
              <button 
                type="button"
                onClick={() => setAiOpen?.(true)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
              >
                  <Sparkles size={12} className="text-[var(--color-primary)] group-hover:animate-spin-slow" />
                  <span className="text-[10px] font-bold">AI COMMAND</span>
                  <div className="flex items-center gap-0.5 ml-2 text-[9px] text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] px-1 rounded">
                      <span>⌘</span><span>K</span>
                  </div>
              </button>
          )}
      </div>
    </div>
  );
};

const NavButton = ({ icon: Icon, active, onClick, tooltip }: { icon: React.ElementType, active?: boolean, onClick: () => void, tooltip?: string }) => (
    <button 
        type="button"
        onClick={onClick}
        title={tooltip}
        className={cn(
            "w-8 h-8 flex items-center justify-center rounded-sm transition-all relative",
            active 
                ? "bg-[var(--color-primary)] text-white shadow-sm" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
        )}
    >
        <Icon size={14} />
        {active && <div className="absolute -bottom-1 w-2 h-0.5 bg-current rounded-full" />}
    </button>
);
