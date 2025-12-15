import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Database, 
  Hammer, 
  Settings,
  Cpu,
  Network,
  Users
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }: { icon: React.ElementType, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 group
      ${active 
        ? 'bg-zinc-800 text-white shadow-md border-l-2 border-indigo-500' 
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
      }
    `}
  >
    <Icon size={18} className={`${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const VolcanoNavigation = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
      if (path === '/' && location.pathname === '/') return true;
      if (path !== '/' && location.pathname.startsWith(path)) return true;
      return false;
  };

  const navItems = [
    { label: 'Nexus', path: '/', icon: Network },
    { label: 'Boardroom', path: '/boardroom', icon: LayoutDashboard },
    { label: 'Executive Office', path: '/office', icon: Briefcase },
    { label: 'Workspace', path: '/workspace', icon: Briefcase },
    { label: 'Roles', path: '/creator', icon: Users },
    { label: 'Factory', path: '/builder', icon: Hammer },
    { label: 'Data Center', path: '/data', icon: Database },
    { label: 'Internals', path: '/coore', icon: Cpu },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 text-indigo-500">
            <Cpu size={24} />
            <span className="font-bold text-lg tracking-wider text-white">VOLCANO</span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-6 px-3">
            <div className="mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Apps</div>
            {navItems.map((item) => (
                <NavItem 
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                />
            ))}
        </div>

        {/* User / Footer */}
        <div className="p-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-inner" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200">Admin</span>
                    <span className="text-xs text-zinc-500">Visual OS v2.0</span>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        {/* We can put a top bar here if needed, but for now just the content */}
        <div className="flex-1 overflow-auto">
            {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};
