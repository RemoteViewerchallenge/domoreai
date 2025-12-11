import { Link, useLocation } from 'react-router-dom';
import { Settings, FolderOpen, LayoutGrid, Database, Users, Workflow, Briefcase } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import useIngestStore from '../stores/ingest.store';

export const UnifiedMenuBar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const isIngesting = useIngestStore(state => state.activeCount > 0);
  const currentPath = useIngestStore(state => state.currentPath);
  const filesProcessed = useIngestStore(state => state.filesProcessed);
  const ingestStatus = currentPath ? `Embedding: ${currentPath} (${filesProcessed} files)` : 'Embedding in progress';
  
  const menuItems = [
    { path: '/workspace', icon: LayoutGrid, label: 'Workspace', color: 'cyan' },
    { path: '/creator', icon: Users, label: 'Creator Studio', color: 'purple' },
    { path: '/datacenter', icon: Database, label: 'Data Center', color: 'magenta' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const menuStyle = theme.layout.menuStyle;

  // Compact mode - 24px height, icons only
  if (menuStyle === 'compact') {
    return (
      <div className="flex-none h-6 bg-black border-b-2 border-[var(--color-primary)] flex items-center justify-between px-2 font-mono shadow-[0_0_20px_rgba(0,255,255,0.3)] z-50 relative">
        {/* Left: Navigation Icons */}
        <div className="flex items-center gap-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`p-1 rounded transition-all ${
                isActive(item.path)
                  ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                  : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
              }`}
              title={item.label}
            >
              <item.icon size={14} strokeWidth={3} />
            </Link>
          ))}
        </div>

        {/* Right: Settings & File Location Icons */}
        <div className="flex items-center gap-1">
          {isIngesting && (
            <div title={ingestStatus} className="flex items-center gap-1 mr-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[8px] text-yellow-400 max-w-[80px] truncate">{currentPath?.split('/').pop() || 'embedding'}</span>
            </div>
          )}
          <Link
            to="/settings"
            className={`p-1 rounded transition-all ${
              isActive('/settings')
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
            }`}
            title="Settings"
          >
            <Settings size={14} strokeWidth={3} />
          </Link>
          <Link
            to="/file-location"
            className={`p-1 rounded transition-all ${
              isActive('/file-location')
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
            }`}
            title="File Location"
          >
            <FolderOpen size={14} strokeWidth={3} />
          </Link>
        </div>
      </div>
    );
  }

  // Dashboard mode - 48px height, large buttons
  if (menuStyle === 'dashboard') {
    return (
      <div className="flex-none h-12 bg-black border-b-4 border-[var(--color-primary)] flex items-center justify-between px-4 font-mono shadow-[0_0_30px_rgba(0,255,255,0.5)] z-50 relative">
        {/* Left: Navigation Buttons */}
        <div className="flex items-center gap-3">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all ${
                isActive(item.path)
                  ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                  : 'text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
              }`}
            >
              <item.icon size={18} strokeWidth={3} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Right: Settings & File Location Buttons */}
        <div className="flex items-center gap-3">
          {isIngesting && (
            <div title={ingestStatus} className="flex items-center gap-2 mr-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-400 max-w-[200px] truncate">{currentPath} ({filesProcessed})</span>
            </div>
          )}
          <Link
            to="/settings"
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all ${
              isActive('/settings')
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                : 'text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
            }`}
          >
            <Settings size={18} strokeWidth={3} />
            <span>Settings</span>
          </Link>
          <Link
            to="/file-location"
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all ${
              isActive('/file-location')
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                : 'text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
            }`}
          >
            <FolderOpen size={18} strokeWidth={3} />
            <span>Files</span>
          </Link>
        </div>
      </div>
    );
  }

  // Standard mode - 32px height, icons with labels on hover
  return (
    <div className="flex-none h-8 bg-black border-b-2 border-[var(--color-primary)] flex items-center justify-between px-3 font-mono shadow-[0_0_20px_rgba(0,255,255,0.3)] z-50 relative">
      {/* Left: Navigation Links */}
      <div className="flex items-center gap-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
              isActive(item.path)
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
            }`}
          >
            <item.icon size={16} strokeWidth={3} />
            <span className={`text-[10px] uppercase tracking-wider ${
              isActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden'
            } transition-all`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Right: Settings & File Location */}
      <div className="flex items-center gap-1">
        {isIngesting && (
          <div title={ingestStatus} className="flex items-center gap-1 mr-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[8px] text-yellow-400 max-w-[80px] truncate">{currentPath?.split('/').pop() || 'embedding'}</span>
          </div>
        )}
        <Link
          to="/settings"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
            isActive('/settings')
              ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
          }`}
          title="Settings"
        >
          <Settings size={16} strokeWidth={3} />
          <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            Settings
          </span>
        </Link>
        <Link
          to="/file-location"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
            isActive('/file-location')
              ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
          }`}
          title="File Location"
        >
          <FolderOpen size={16} strokeWidth={3} />
          <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            Files
          </span>
        </Link>
      </div>
    </div>
  );
};