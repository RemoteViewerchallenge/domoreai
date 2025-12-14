import React from 'react';
import { 
  Search, 
  Bell, 
  Cpu, 
  Database, 
  Layout, 
  Palette, // New Icon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
// import { useNewUITheme } from './appearance/NewUIThemeProvider.js';

export const UnifiedMenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { theme, setTheme } = useNewUITheme();
  
  // We need to trigger the global event for the Theme Editor
  const toggleThemeEditor = () => {
    // Dispatch a custom event that NewUIRoot listens for
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
  };

  const NavItem = ({ icon: Icon, label, path, active }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`relative group flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 ${
        active 
          ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20' 
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5'
      }`}
    >
      <Icon size={14} />
      <span className="text-xs font-bold tracking-wide">{label}</span>
      
      {/* Active Glow Indicator */}
      {active && (
        <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
      )}
    </button>
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)]/80 backdrop-blur-md flex items-center justify-between px-4 z-50 select-none">
      
      {/* Left: Navigation */}
      <div className="flex items-center gap-1">
        <div className="mr-4 flex items-center gap-2 text-[var(--color-primary)]">
          <Cpu size={18} />
          <span className="font-black tracking-widest text-sm">TITANIUM</span>
        </div>

        <div className="h-4 w-[1px] bg-[var(--color-border)] mx-2" />

        <NavItem icon={Layout} label="WORKSPACE" path="/workspace" active={isActive('/workspace')} />
        <NavItem icon={Database} label="DATA" path="/data" active={isActive('/data')} />
        <NavItem icon={Cpu} label="NODES" path="/supernodes" active={isActive('/supernodes')} />
        <NavItem icon={Layout} label="UI BUILDER" path="/interface-builder" active={isActive('/interface-builder')} />
      </div>

      {/* Center: Command Center (Placeholder) */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary)] transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search nodes, data, or commands... (Ctrl+K)"
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-full py-1.5 pl-9 pr-4 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder-[var(--color-text-secondary)]"
          />
        </div>
      </div>

      {/* Right: Tools */}
      <div className="flex items-center gap-3">
        <button 
            onClick={toggleThemeEditor}
            className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-full transition-colors"
            title="Open Theme Editor"
        >
            <Palette size={16} />
        </button>

        <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--color-error)] rounded-full animate-pulse" />
        </button>
        
        <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)] transition-colors">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]" />
          <span className="text-[10px] font-bold pr-1">ADMIN</span>
        </button>
      </div>
    </div>
  );
};