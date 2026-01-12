import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Hammer, Palette, Rocket, ChevronDown 
} from 'lucide-react';

// Import the sub-toolbars we designed earlier
import { BuilderToolbar } from './toolbars/BuilderToolbar.js';
import { ThemeToolbar } from './toolbars/ThemeToolbar.js';

export const UnifiedNebulaBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);

  // 1. Detect Context
  const isBuilder = location.pathname.includes('/admin/builder');
  const isTheme = location.pathname.includes('/admin/theme');
  
  // If we are just viewing the app (Runtime), DO NOT render the bar.
  // (Unless you want a specific "Admin Overlay" like WordPress)
  if (!location.pathname.startsWith('/admin')) {
    return <FloatingEditTrigger />;
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-neutral-950 border-b border-neutral-800 z-[9999] flex items-center shadow-xl">
      
      {/* --- ZONE A: THE "OS" BUTTON (Far Left) --- */}
      {/* This is your "Start Menu" to switch apps */}
      <div className="relative border-r border-neutral-800 h-full flex items-center">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="h-full px-4 flex items-center gap-2 hover:bg-neutral-900 transition-colors text-white font-bold tracking-wider"
        >
          <div className="w-3 h-3 bg-indigo-500 rounded-sm shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <span className="text-sm">NEBULA</span>
          <ChevronDown size={10} className={`text-neutral-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* The Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-14 left-0 w-64 bg-neutral-900 border border-neutral-800 shadow-2xl rounded-br-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            <MenuHeader title="Switch Context" />
            <MenuItem 
              icon={<Rocket className="text-green-500" size={16} />} 
              label="Project Dashboard" 
              desc="View all cartridges"
              onClick={() => { navigate('/admin/projects'); setMenuOpen(false); }}
            />
            <MenuItem 
              icon={<Hammer className="text-blue-500" size={16} />} 
              label="Interface Builder" 
              desc={`Edit ${projectId || 'Current App'}`}
              onClick={() => { navigate(`/admin/builder/${projectId || 'workbench'}`); setMenuOpen(false); }}
            />
            <MenuItem 
              icon={<Palette className="text-pink-500" size={16} />} 
              label="Theme Manager" 
              desc="Global styles & tokens"
              onClick={() => { navigate('/admin/theme'); setMenuOpen(false); }}
            />
            <div className="h-px bg-neutral-800 my-1" />
            <MenuItem 
              icon={<ChevronDown className="rotate-90 text-neutral-500" size={16} />} 
              label="Exit to App" 
              desc="Close Admin Tools"
              onClick={() => { navigate('/'); setMenuOpen(false); }}
            />
          </div>
        )}
      </div>

      {/* --- ZONE B: THE CONTEXTUAL toolbar (Center/Right) --- */}
      {/* This area changes based on what you are doing */}
      <div className="flex-1 flex items-center justify-between px-4">
        {isBuilder && <BuilderToolbar />}
        {isTheme && <ThemeToolbar />}
        
        {/* Fallback if on a generic admin page */}
        {!isBuilder && !isTheme && (
          <div className="text-neutral-500 text-sm font-mono">Select a tool from the menu to begin.</div>
        )}
      </div>

    </div>
  );
};

// --- Sub-components for cleaner code ---

const MenuHeader = ({ title }: { title: string }) => (
  <div className="px-4 py-2 bg-neutral-950 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
    {title}
  </div>
);

const MenuItem = ({ icon, label, desc, onClick }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-start gap-3 group"
  >
    <div className="mt-1 group-hover:scale-110 transition-transform">{icon}</div>
    <div>
      <div className="text-sm text-white font-medium leading-none mb-1">{label}</div>
      <div className="text-xs text-neutral-500 leading-none">{desc}</div>
    </div>
  </button>
);

// A tiny button that appears on the Live App to let you get back to Admin
const FloatingEditTrigger = () => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate('/admin/builder/workbench')} // Or smart detect current ID
      className="fixed bottom-4 right-4 bg-neutral-900 text-white p-3 rounded-full shadow-2xl z-[50] hover:scale-110 transition-transform opacity-50 hover:opacity-100 group"
      title="Open Nebula Admin"
    >
      <Hammer />
    </button>
  );
};
