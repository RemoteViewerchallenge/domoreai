import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dna, 
  Database, 
  Settings2, 
  Layout as LayoutIcon,
  ChevronLeft
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activePage?: string;
  hideSidebar?: boolean;
}

export const Layout = ({ children, activePage, hideSidebar = false }: LayoutProps) => {
  const navigate = useNavigate();

  // If sidebar is hidden (e.g. data explorer handles its own), render minimal wrapper
  if (hideSidebar) {
    return (
      <div className="flex h-full w-full bg-[#0a0e14] text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#0a0e14] text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-16 flex flex-col items-center py-4 gap-4 border-r border-[#2d3748] bg-[#1a1f2e]">
        <div 
          className="p-2 rounded-lg bg-blue-600 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
          title="Back to Workspace"
        >
          <ChevronLeft size={20} />
        </div>

        <div className="w-8 h-[1px] bg-[#2d3748]" />

        <NavButton 
          icon={Dna} 
          active={activePage === 'coore'} 
          onClick={() => navigate('/coore')} 
          label="C.O.R.E."
        />
        <NavButton 
          icon={Database} 
          active={activePage === 'data'} 
          onClick={() => navigate('/data')} 
          label="Data"
        />
        <NavButton 
          icon={Settings2} 
          active={activePage === 'customizer'} 
          onClick={() => navigate('/customizer')} 
          label="Customizer"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

const NavButton = ({ icon: Icon, active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-xl transition-all group relative ${
      active 
        ? 'bg-blue-500/10 text-blue-400' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
    }`}
    title={label}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    {active && (
      <div className="absolute right-0 top-3 bottom-3 w-0.5 bg-blue-400 rounded-l-full" />
    )}
  </button>
);
