import React from 'react';
import { 
  Rocket, Hammer, Palette, LayoutGrid, Settings, HelpCircle 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

export const NebulaSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isWorkbench = location.pathname === '/' || location.pathname === '/workbench';
    const isBuilder = location.pathname.includes('/builder');
    const isTheme = location.pathname.includes('/theme');

    return (
        <div className="w-12 h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-4 z-40 select-none">
            <SidebarIcon 
                icon={Rocket} 
                active={isWorkbench} 
                onClick={() => navigate('/')} 
                tooltip="Workbench" 
            />
            <SidebarIcon 
                icon={Hammer} 
                active={isBuilder} 
                onClick={() => navigate('/admin/builder/workbench')} 
                tooltip="Interface Builder" 
            />
            <SidebarIcon 
                icon={Palette} 
                active={isTheme} 
                onClick={() => navigate('/admin/theme')} 
                tooltip="Theme Engine" 
            />
            
            <div className="mt-auto flex flex-col items-center gap-4">
                <SidebarIcon 
                    icon={LayoutGrid} 
                    onClick={() => navigate('/admin/projects')} 
                    tooltip="Projects" 
                />
                <SidebarIcon 
                    icon={Settings} 
                    onClick={() => navigate('/admin/settings')} 
                    tooltip="Settings" 
                />
                <SidebarIcon 
                    icon={HelpCircle} 
                    onClick={() => {}} 
                    tooltip="Help" 
                />
            </div>
        </div>
    );
};

const SidebarIcon = ({ icon: Icon, active, onClick, tooltip }: { icon: React.ElementType, active?: boolean, onClick: () => void, tooltip: string }) => (
    <button
        onClick={onClick}
        title={tooltip}
        className={cn(
            "w-8 h-8 flex items-center justify-center rounded transition-all group",
            active 
                ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20" 
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
        )}
    >
        <Icon size={18} className={cn("transition-transform", active ? "scale-110" : "group-hover:scale-110")} />
    </button>
);
