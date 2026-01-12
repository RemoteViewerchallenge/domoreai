import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Hammer, Palette, Rocket, ChevronDown, Command, Sparkles, LayoutGrid
} from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export const UnifiedNebulaBar = ({ aiOpen, setAiOpen }: { aiOpen?: boolean, setAiOpen?: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localAiOpen, setLocalAiOpen] = useState(false);

  const isAiOpen = aiOpen ?? localAiOpen;
  const setIsAiOpen = setAiOpen ?? setLocalAiOpen;

  // Context Detection
  const isBuilder = location.pathname.includes('/builder');
  const isTheme = location.pathname.includes('/theme');
  const isWorkbench = location.pathname.includes('/workbench') || location.pathname.includes('/role') || location.pathname.includes('/admin');

  return (
    <div className="flex-none h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between z-50 select-none">
      
      {/* 1. SYSTEM MENU (Left) */}
      <div className="flex items-center h-full">
        <div className="relative h-full border-r border-[var(--border-color)]">
          <button 
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-full px-3 flex items-center gap-2 hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-primary)]"
          >
            <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-[1px] shadow-sm" />
            <span className="text-[11px] font-bold tracking-wider font-mono">NEBULA</span>
            <ChevronDown size={10} className={cn("text-[var(--text-muted)] transition-transform", menuOpen && "rotate-180")} />
          </button>

          {/* System Dropdown */}
          {menuOpen && (
            <div className="absolute top-10 left-0 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-br-lg overflow-hidden animate-in fade-in slide-in-from-top-1 z-50">
               <div className="px-3 py-1.5 bg-[var(--bg-primary)] text-[9px] font-bold text-[var(--text-muted)] uppercase">Active Project</div>
               <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                  {projectId || 'domoreai-default'}
               </div>
               
               <div className="p-1 space-y-0.5">
                 <MenuRow icon={Rocket} label="Workbench" onClick={() => { navigate('/'); setMenuOpen(false); }} active={isWorkbench && !isBuilder && !isTheme} />
                 <MenuRow icon={Hammer} label="Interface Builder" onClick={() => { navigate('/admin/builder/workbench'); setMenuOpen(false); }} active={isBuilder} />
                 <MenuRow icon={Palette} label="Theme Engine" onClick={() => { navigate('/admin/theme'); setMenuOpen(false); }} active={isTheme} />
                 <div className="h-px bg-[var(--border-color)] my-1" />
                 <MenuRow icon={LayoutGrid} label="Project Manager" onClick={() => { navigate('/admin/projects'); setMenuOpen(false); }} />
               </div>
            </div>
          )}
        </div>

        {/* 2. CONTEXT BREADCRUMBS */}
        <div className="px-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="opacity-50">/</span>
            <span className="uppercase font-bold hover:text-[var(--text-primary)] cursor-pointer">
                {isBuilder ? 'Builder' : isTheme ? 'Theme' : 'Workbench'}
            </span>
            {projectId && (
                <>
                    <span className="opacity-50">/</span>
                    <span className="text-[var(--text-primary)]">{projectId}</span>
                </>
            )}
        </div>
      </div>

      {/* 3. CENTER TOOLBAR (Dynamic) */}
      <div className="flex-1 flex justify-center items-center">
         {isBuilder && (
             <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-0.5">
                 <ToolBtn icon={LayoutGrid} tooltip="Components" active />
                 <ToolBtn icon={Command} tooltip="Actions" />
                 <div className="w-px h-3 bg-[var(--border-color)] mx-1" />
                 <span className="text-[9px] text-[var(--text-muted)] px-2">Drag components to canvas</span>
             </div>
         )}
      </div>

      {/* 4. SUPER AI BUTTON (Right) */}
      <div className="h-full border-l border-[var(--border-color)] flex items-center">
          {isAiOpen ? (
              <div className="flex items-center w-80 h-full bg-[var(--bg-primary)] animate-in slide-in-from-right-2">
                  <div className="w-8 h-full flex items-center justify-center text-[var(--color-primary)]">
                       <Sparkles size={14} />
                  </div>
                  <input 
                    id="nebula-ai-input"
                    autoFocus
                    placeholder="Ask Nebula to build..." 
                    className="flex-1 h-full bg-transparent border-none outline-none text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    onBlur={() => setIsAiOpen(false)}
                    onKeyDown={(e) => e.key === 'Enter' && alert('AI Triggered: ' + e.currentTarget.value)}
                  />
              </div>
          ) : (
              <button 
                type="button"
                onClick={() => setIsAiOpen(true)}
                className="h-full px-4 flex items-center gap-2 text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                  <Sparkles size={12} />
                  <span>AI ASSIST</span>
                  <div className="ml-2 px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] text-[9px] font-mono">
                      ⌘K
                  </div>
              </button>
          )}
      </div>
    </div>
  );
};

const MenuRow = ({ icon: Icon, label, onClick, active }: { icon: React.ElementType, label: string, onClick: () => void, active?: boolean }) => (
    <button 
        type="button"
        onClick={() => { onClick(); }}
        className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-colors",
            active 
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
        )}
    >
        <Icon size={12} />
        <span className="text-[11px] font-medium">{label}</span>
    </button>
);

const ToolBtn = ({ icon: Icon, active, tooltip }: { icon: React.ElementType, active?: boolean, tooltip?: string }) => (
    <button 
        type="button"
        className={cn(
            "w-6 h-6 flex items-center justify-center rounded-sm transition-colors",
            active ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )} 
        title={tooltip}
    >
        <Icon size={12} />
    </button>
);
