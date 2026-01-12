import React, { useMemo } from 'react';
import { Cpu, Settings, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SuperAiButton } from './ui/SuperAiButton.js';
import { cn } from '../lib/utils.js';

export interface NavItemDef {
  icon: React.ElementType;
  label: string;
  path?: string;
  action?: () => void;
  isActive?: boolean;
}

export const UnifiedMenuBar = ({ items = [] }: { items: NavItemDef[] }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentContext = useMemo(() => {
     if (location.pathname.includes('builder')) return "Nebula Creator";
     if (location.pathname.includes('workbench')) return "Workbench";
     return "Global Scope";
  }, [location.pathname]);

  return (
    <div 
      className="flex items-center justify-between px-4 z-50 select-none border-b border-[var(--colors-border)] transition-all duration-300"
      style={{
        height: 'var(--components-menu-bar-height)',
        background: 'var(--components-menu-bar-background)',
        backdropFilter: 'blur(var(--components-menu-bar-backdrop-blur))',
      }}
    >
      {/* Branding & Nav */}
      <div className="flex items-center" style={{ gap: 'var(--components-menu-bar-item-gap)' }}>
        <div className="mr-4 flex items-center gap-2 text-[var(--colors-primary)]">
          <Cpu size={18} />
          <span className="font-black tracking-[0.2em] text-xs">TITANIUM</span>
        </div>
        <div className="h-4 w-px bg-[var(--colors-border)] mx-2" />
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => item.action ? item.action() : navigate(item.path!)}
            className={cn(
              "relative group flex items-center gap-2 px-3 py-1.5 transition-all rounded-[var(--shape-radius-sm)]",
              item.isActive ? "text-[var(--colors-primary)] bg-[var(--colors-primary)]/10" : "text-[var(--colors-text-secondary)] hover:bg-[var(--colors-text)]/5"
            )}
          >
            <item.icon size={14} />
            <span style={{ fontSize: 'var(--components-menu-bar-font-size)' }} className="font-bold tracking-widest uppercase">{item.label}</span>
          </button>
        ))}
      </div>

      {/* AI Context */}
      <div className="flex-1 flex justify-center"><SuperAiButton contextId={currentContext} /></div>

      {/* Tools */}
      <div className="flex gap-2">
         <Settings size={16} className="text-[var(--colors-text-secondary)]" />
         <Bell size={16} className="text-[var(--colors-text-secondary)]" />
      </div>
    </div>
  );
};
