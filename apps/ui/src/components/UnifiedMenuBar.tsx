import { Link, useLocation } from 'react-router-dom';
import { Settings, FolderOpen, LayoutGrid, Database, Users, Workflow, Briefcase, Palette, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import useIngestStore from '../stores/ingest.store';
import { useWorkspaceStore } from '../stores/workspace.store';

export const UnifiedMenuBar = () => {
  const location = useLocation();
  const { theme, applyPreset } = useTheme();
  const [showPresets, setShowPresets] = useState(false);
  const { columns, setColumns, toggleSidebar, showSidebar } = useWorkspaceStore();
  const isIngesting = useIngestStore(state => state.activeCount > 0);
  const currentPath = useIngestStore(state => state.currentPath);
  const filesProcessed = useIngestStore(state => state.filesProcessed);
  const ingestStatus = currentPath ? `Embedding: ${currentPath} (${filesProcessed} files)` : 'Embedding in progress';
  
  const menuItems = [
    { path: '/workspace', icon: LayoutGrid, label: 'Workspace', color: 'cyan' },
    { path: '/creator', icon: Users, label: 'Creator Studio', color: 'purple' },
    { path: '/datacenters', icon: Database, label: 'Datacenters', color: 'magenta' },
  ];

  // Only match exact path for main menu navigation
  const isActive = (path: string) => location.pathname === path;

  const menuStyle = theme.layout.menuStyle;
  const menuBarBg = theme.colors.menuBarBackground || 'black';
  const iconColor = theme.colors.iconColor || theme.colors.primary.value;
  const buttonBg = theme.colors.buttonBackground || 'transparent';
  const buttonText = theme.colors.buttonText || theme.colors.primary.value;

  // Compact mode - 24px height, icons only
  if (menuStyle === 'compact') {
    return (
      <div 
        className="flex-none h-6 border-b-2 border-[var(--color-primary)] flex items-center justify-between px-2 font-mono shadow-[0_0_20px_rgba(0,255,255,0.3)] z-50 relative"
        style={{ background: menuBarBg }}
      >
        {/* Left: Navigation Icons */}
        <div className="flex items-center gap-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`p-1 rounded transition-all ${
                isActive(item.path)
                  ? 'text-black shadow-[var(--glow-primary)]'
                  : 'hover:text-black'
              }`}
              style={{
                background: isActive(item.path) ? theme.colors.primary.value : buttonBg,
                color: isActive(item.path) ? 'black' : buttonText
              }}
              title={item.label}
            >
              <item.icon size={14} strokeWidth={3} style={{ color: isActive(item.path) ? 'black' : iconColor }} />
            </Link>
          ))}
        </div>

        {/* Right: Settings & File Location Icons */}
        <div className="flex items-center gap-1">
          {isActive('/workspace') && (
            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 h-5 mr-2">
              <button
                onClick={() => setColumns(Math.max(1, columns - 1))}
                className="px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-l text-xs"
              >
                -
              </button>
              <span className="px-2 text-[10px] font-bold text-[var(--color-primary)] w-6 text-center">{columns}</span>
              <button
                onClick={() => setColumns(Math.min(6, columns + 1))}
                className="px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-r text-xs"
              >
                +
              </button>
            </div>
          )}
          {isIngesting && (
            <div title={ingestStatus} className="flex items-center gap-1 mr-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[8px] text-yellow-400 max-w-[80px] truncate">{currentPath?.split('/').pop() || 'embedding'}</span>
            </div>
          )}
          {/* Theme Mode Toggle Button */}
          <button
            onClick={() => {
              // Cycle through light, dark, gray (medium)
              const modes = ['light', 'dark', 'gray'];
              const current = modes.findIndex(m => theme.preset === m);
              const next = modes[(current + 1) % modes.length];
              applyPreset(next);
            }}
            className="p-1 rounded transition-all hover:text-black"
            style={{
              background: theme.colors.primary.value,
              color: 'black',
              minWidth: 36
            }}
            title="Toggle Theme Mode"
          >
            <Palette size={14} strokeWidth={3} style={{ color: 'black' }} />
            <span className="ml-1 text-[10px] font-bold uppercase">
              {theme.preset === 'light' ? 'Light' : theme.preset === 'dark' ? 'Dark' : 'Medium'}
            </span>
          </button>
          <button
            onClick={toggleSidebar}
            className={`p-1 rounded transition-all ${
              showSidebar
                ? 'text-black shadow-[var(--glow-primary)]'
                : 'hover:text-black'
            }`}
            style={{
                background: showSidebar ? theme.colors.primary.value : buttonBg,
                color: showSidebar ? 'black' : buttonText
            }}
            title="Settings"
          >
            <Settings size={14} strokeWidth={3} style={{ color: showSidebar ? 'black' : iconColor }} />
          </button>
          <Link
            to="/file-location"
            className={`p-1 rounded transition-all ${
              isActive('/file-location')
                ? 'text-black shadow-[var(--glow-primary)]'
                : 'hover:text-black'
            }`}
            style={{
                background: isActive('/file-location') ? theme.colors.primary.value : buttonBg,
                color: isActive('/file-location') ? 'black' : buttonText
            }}
            title="File Location"
          >
            <FolderOpen size={14} strokeWidth={3} style={{ color: isActive('/file-location') ? 'black' : iconColor }} />
          </Link>
        </div>
      </div>
    );
  }

  // Dashboard mode - 48px height, large buttons
  if (menuStyle === 'dashboard') {
    return (
      <div 
        className="flex-none h-12 border-b-4 border-[var(--color-primary)] flex items-center justify-between px-4 font-mono shadow-[0_0_30px_rgba(0,255,255,0.5)] z-50 relative"
        style={{ background: menuBarBg }}
      >
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
          {isActive('/workspace') && (
            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 h-8 mr-2">
              <button
                onClick={() => setColumns(Math.max(1, columns - 1))}
                className="px-3 h-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-l text-sm"
              >
                -
              </button>
              <span className="px-3 text-xs font-bold text-[var(--color-primary)] w-8 text-center">{columns}</span>
              <button
                onClick={() => setColumns(Math.min(6, columns + 1))}
                className="px-3 h-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-r text-sm"
              >
                +
              </button>
            </div>
          )}
          {isIngesting && (
            <div title={ingestStatus} className="flex items-center gap-2 mr-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-400 max-w-[200px] truncate">{currentPath} ({filesProcessed})</span>
            </div>
          )}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all ${
                showPresets
                  ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                  : 'text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
              }`}
            >
              <Palette size={18} strokeWidth={3} />
              <span>Theme</span>
            </button>
            {showPresets && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-[var(--color-card-background)] border border-[var(--color-border)] rounded shadow-xl overflow-hidden z-50 flex flex-col">
                {['light', 'dark', 'gray'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => { applyPreset(preset as any); setShowPresets(false); }}
                    className="px-3 py-2 text-left text-xs hover:bg-[var(--color-primary)] hover:text-black capitalize transition-colors"
                    style={{ color: theme.colors.text }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all ${
              showSidebar
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                : 'text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
            }`}
          >
            <Settings size={18} strokeWidth={3} />
            <span>Settings</span>
          </button>
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
    <div 
      className="flex-none h-8 border-b-2 border-[var(--color-primary)] flex items-center justify-between px-3 font-mono shadow-[0_0_20px_rgba(0,255,255,0.3)] z-50 relative"
      style={{ background: menuBarBg }}
    >
      {/* Left: Navigation Links */}
      <div className="flex items-center gap-1 flex-none">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
              isActive(item.path)
                ? 'text-black shadow-[var(--glow-primary)]'
                : 'hover:text-black'
            }`}
            style={{
                background: isActive(item.path) ? theme.colors.primary.value : buttonBg,
                color: isActive(item.path) ? 'black' : buttonText
            }}
          >
            <item.icon size={16} strokeWidth={3} style={{ color: isActive(item.path) ? 'black' : iconColor }} />
            <span className={`text-[10px] uppercase tracking-wider ${
              isActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden'
            } transition-all`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Center: Search & AI */}
      <div className="flex-1 flex items-center justify-center px-4 max-w-xl mx-auto">
        <div className="relative w-full flex items-center group">
            <div className="absolute left-2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                <Search size={14} />
            </div>
            <input 
                type="text" 
                placeholder="Search workspace..." 
                className="w-full bg-black/10 border border-[var(--color-border)] rounded-md py-1 pl-8 pr-8 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-black/20 transition-all placeholder:text-[var(--color-text-muted)]"
            />
            <button 
                className="absolute right-1.5 p-0.5 rounded hover:bg-[var(--color-primary)] hover:text-black text-[var(--color-primary)] transition-all" 
                title="AI Vision Context"
            >
                <Sparkles size={14} />
            </button>
        </div>
      </div>

      {/* Right: Settings & File Location */}
      <div className="flex items-center gap-1 flex-none">
        {isActive('/workspace') && (
            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 h-6 mr-2">
              <button
                onClick={() => setColumns(Math.max(1, columns - 1))}
                className="px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-l text-xs"
              >
                -
              </button>
              <span className="px-2 text-[10px] font-bold text-[var(--color-primary)] w-6 text-center">{columns}</span>
              <button
                onClick={() => setColumns(Math.min(6, columns + 1))}
                className="px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-r text-xs"
              >
                +
              </button>
            </div>
          )}
        {isIngesting && (
          <div title={ingestStatus} className="flex items-center gap-1 mr-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[8px] text-yellow-400 max-w-[80px] truncate">{currentPath?.split('/').pop() || 'embedding'}</span>
          </div>
        )}
        <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
                showPresets
                  ? 'text-black shadow-[var(--glow-primary)]'
                  : 'hover:text-black'
              }`}
              style={{
                background: showPresets ? theme.colors.primary.value : buttonBg,
                color: showPresets ? 'black' : buttonText
              }}
              title="Theme Presets"
            >
              <Palette size={16} strokeWidth={3} style={{ color: showPresets ? 'black' : iconColor }} />
              <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
                Theme
              </span>
            </button>
            {showPresets && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-[var(--color-card-background)] border border-[var(--color-border)] rounded shadow-xl overflow-hidden z-50 flex flex-col">
                {['light', 'dark', 'gray'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => { applyPreset(preset as any); setShowPresets(false); }}
                    className="px-3 py-2 text-left text-xs hover:bg-[var(--color-primary)] hover:text-black capitalize transition-colors"
                    style={{ color: theme.colors.text }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
        </div>
        <button
          onClick={toggleSidebar}
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
            showSidebar
              ? 'text-black shadow-[var(--glow-primary)]'
              : 'hover:text-black'
          }`}
          style={{
            background: showSidebar ? theme.colors.primary.value : buttonBg,
            color: showSidebar ? 'black' : buttonText
          }}
          title="Settings"
        >
          <Settings size={16} strokeWidth={3} style={{ color: showSidebar ? 'black' : iconColor }} />
          <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            Settings
          </span>
        </button>
        <Link
          to="/file-location"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold ${
            isActive('/file-location')
              ? 'text-black shadow-[var(--glow-primary)]'
              : 'hover:text-black'
          }`}
          style={{
            background: isActive('/file-location') ? theme.colors.primary.value : buttonBg,
            color: isActive('/file-location') ? 'black' : buttonText
          }}
          title="File Location"
        >
          <FolderOpen size={16} strokeWidth={3} style={{ color: isActive('/file-location') ? 'black' : iconColor }} />
          <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all">
            Files
          </span>
        </Link>
      </div>
    </div>
  );
};