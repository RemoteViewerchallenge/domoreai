import React, { useMemo } from 'react';
import { 
  Search, 
  Bell, 
  Cpu, 
  Database, 
  Layout, 
  Palette, 
  PenTool,
  Network,
  Mic,
  Settings
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AIContextButton } from './AIContextButton.js';

export const UnifiedMenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // We need to trigger the global event for the Theme Editor
  const toggleThemeEditor = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
  };

  const NavItem = ({ icon: Icon, label, path, active }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`relative group flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all duration-200 ${
        active 
          ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-b-2 border-[var(--color-primary)]' 
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5 border-b-2 border-transparent'
      }`}
    >
      <Icon size={14} />
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
      
      {/* Active Glow Indicator */}
      {active && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)] opacity-50" />
      )}
    </button>
  );

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Context Logic for AI Button
  const currentContext = useMemo(() => {
     if (location.pathname.startsWith('/data')) return "Database & Schemas";
     if (location.pathname.startsWith('/workspace')) return "Project Files & Active Agents";
     if (location.pathname.startsWith('/creator')) return "Role Definitions & Logic";
     if (location.pathname.startsWith('/factory')) return "UI Components & Layouts";
     return "Global Scope";
  }, [location.pathname]);

  return (
    <div className="h-10 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)]/80 backdrop-blur-md flex items-center justify-between px-2 z-50 select-none">
      
      {/* Left: Navigation */}
      <div className="flex items-center gap-1">
        <div className="mr-2 flex items-center gap-2 text-[var(--color-primary)] px-2">
          <Cpu size={16} />
          <span className="font-black tracking-widest text-xs">TITANIUM</span>
        </div>

        <div className="h-4 w-px bg-[var(--color-border)] mx-1" />

        <NavItem icon={Layout} label="Workspace" path="/workspace/adaptive" active={isActive('/workspace')} />
        <NavItem icon={Database} label="Data" path="/data" active={isActive('/data')} />
        <NavItem icon={Network} label="Creator" path="/creator" active={isActive('/creator')} />
        <NavItem icon={PenTool} label="Factory" path="/factory" active={isActive('/factory')} />
      </div>

      {/* Center: Command Center & AI Context */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center gap-2">
         {/* AI Super Button */}
         <div className="flex items-center gap-2 p-0.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-full pr-3 relative group focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
             <AIContextButton context={currentContext} size="sm" />
             <input 
                type="text" 
                placeholder={`Ask AI about ${currentContext}...`}
                className="w-64 bg-transparent border-none text-xs text-[var(--color-text)] focus:outline-none placeholder-[var(--color-text-muted)]"
             />
             <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2 text-[var(--color-text-muted)]">
                 <button className="p-1 hover:text-[var(--color-primary)] transition-colors"><Mic size={12} /></button>
             </div>
         </div>
      </div>

      {/* Right: Tools hardcoded to square buttons per request */}
      <div className="flex items-center gap-1">
        <button 
            onClick={toggleThemeEditor}
            className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 border border-transparent hover:border-[var(--color-accent)]/50 rounded-sm transition-all"
            title="Open Theme Editor"
        >
            <Palette size={14} />
        </button>

         <button 
            onClick={() => navigate('/settings')}
            className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5 border border-transparent hover:border-[var(--color-text-muted)]/50 rounded-sm transition-all"
            title="Settings"
        >
            <Settings size={14} />
        </button>

        <button className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 border border-transparent hover:border-[var(--color-error)]/50 rounded-sm transition-all relative">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1 h-1 bg-[var(--color-error)] rounded-full animate-pulse" />
        </button>
        
        <div className="h-4 w-px bg-[var(--color-border)] mx-1" />

        <button className="px-2 h-7 flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)] transition-colors">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]" />
          <span className="text-[9px] font-bold">ADMIN</span>
        </button>
      </div>
    </div>
  );
};