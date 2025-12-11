import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Database, Settings, Eye, 
  Menu, Command, ChevronRight, Bell, Search,
  Home, MoreVertical, X
} from 'lucide-react';
import { AIContextButton } from './AIContextButton';

interface LayoutProps {
  children: React.ReactNode;
  activePage?: 'coore' | 'data' | 'customizer' | 'home';
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage = 'home' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [aiVisionActive, setAiVisionActive] = useState(false);

  // --- HOTKEYS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B to toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      // Ctrl+Shift+V for AI Vision
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setAiVisionActive(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- CONTEXT MENU ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
    };

    const handleClick = () => {
      if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, [contextMenu.visible]);

  const navItems = [
    { id: 'coore', label: 'C.O.R.E.', icon: LayoutDashboard, path: '/coore' },
    { id: 'data', label: 'Data Explorer', icon: Database, path: '/data' },
    { id: 'customizer', label: 'Sidebar Customizer', icon: Settings, path: '/customizer' },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-zinc-200 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div 
        className={`
          flex-none bg-[#0c0c0e] border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out z-50
          ${isSidebarOpen ? 'w-64' : 'w-16'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
              N
            </div>
            {isSidebarOpen && <span className="font-bold text-lg tracking-tight">NUI System</span>}
          </div>
        </div>

        {/* AI Vision Button (Prominent) */}
        <div className="p-4">
          <button
            onClick={() => setAiVisionActive(!aiVisionActive)}
            className={`
              w-full relative overflow-hidden group
              ${isSidebarOpen ? 'h-12 rounded-xl' : 'h-10 rounded-lg'}
              bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all
            `}
          >
            <div className={`absolute inset-0 bg-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity ${aiVisionActive ? 'opacity-100 bg-purple-600/20' : ''}`} />
            <div className="flex items-center justify-center h-full gap-3 relative z-10">
              <Eye size={20} className={aiVisionActive ? 'text-purple-400 animate-pulse' : 'text-zinc-400'} />
              {isSidebarOpen && (
                <span className={`font-medium ${aiVisionActive ? 'text-purple-400' : 'text-zinc-400'}`}>
                  AI Vision {aiVisionActive ? 'ON' : 'OFF'}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-2 space-y-1 px-2">
          {navItems.map(item => (
            <a
              key={item.id}
              href="#" // In a real app, use router
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                ${activePage === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              <item.icon size={20} className={activePage === item.id ? 'text-purple-400' : 'group-hover:text-purple-400 transition-colors'} />
              {isSidebarOpen && <span>{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </a>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-zinc-800 space-y-2">
           <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              <AIContextButton size="sm" context="Sidebar" />
              {isSidebarOpen && <span className="text-xs text-zinc-500">v2.0.0</span>}
           </div>
        </div>
      </div>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        
        {/* Top Bar */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#0c0c0e]/50 backdrop-blur z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
              <Menu size={20} />
            </button>
            
            {/* Breadcrumbs / Page Title */}
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Home size={14} />
              <ChevronRight size={14} className="text-zinc-600" />
              <span className="text-zinc-200 font-medium capitalize">{activePage}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Search Bar */}
             <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search (Ctrl+K)..." 
                  className="w-64 bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
             </div>

             <div className="h-6 w-px bg-zinc-800 mx-2" />

             <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0c0c0e]" />
             </button>
             
             <AIContextButton context="Global Toolbar" />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>

      </div>

      {/* --- CUSTOM CONTEXT MENU --- */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 w-48 z-[100] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>System Menu</span>
            <AIContextButton size="sm" context="Context Menu" />
          </div>
          <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-2">
            <Command size={14} /> Command Palette
          </button>
          <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-2">
            <Eye size={14} /> Toggle AI Vision
          </button>
          <div className="h-px bg-zinc-800 my-1" />
          <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            Copy Reference
          </button>
          <button className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            Inspect Element
          </button>
        </div>
      )}

      {/* --- AI VISION OVERLAY --- */}
      {aiVisionActive && (
        <div className="fixed inset-0 pointer-events-none z-[90] border-[4px] border-purple-500/30 shadow-[inset_0_0_100px_rgba(168,85,247,0.2)]">
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
              AI VISION ACTIVE
           </div>
        </div>
      )}

    </div>
  );
};
