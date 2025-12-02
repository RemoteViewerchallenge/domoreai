import { Link, useLocation } from 'react-router-dom';
import { Settings, FolderOpen, LayoutGrid, Database, Users, Workflow, Briefcase } from 'lucide-react';

export const UnifiedMenuBar = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/workspace', icon: LayoutGrid, label: 'Workspace' },
    { path: '/creator', icon: Users, label: 'Creator Studio' },
    { path: '/providers', icon: Database, label: 'Providers' },
    { path: '/projects', icon: Briefcase, label: 'Projects' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="flex-none h-8 bg-black border-b border-zinc-900 flex items-center justify-between px-3 font-mono">
      {/* Left: Navigation Links */}
      <div className="flex items-center gap-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              isActive(item.path)
                ? 'bg-purple-600/20 text-purple-400'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <item.icon size={14} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden'
            } transition-all`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Right: Settings & File Location */}
      <div className="flex items-center gap-1">
        <Link
          to="/settings"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
            isActive('/settings')
              ? 'bg-cyan-600/20 text-cyan-400'
              : 'text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900'
          }`}
          title="Settings"
        >
          <Settings size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            Settings
          </span>
        </Link>
        <Link
          to="/file-location"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
            isActive('/file-location')
              ? 'bg-green-600/20 text-green-400'
              : 'text-zinc-500 hover:text-green-400 hover:bg-zinc-900'
          }`}
          title="File Location"
        >
          <FolderOpen size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            File Location
          </span>
        </Link>
      </div>
    </div>
  );
};