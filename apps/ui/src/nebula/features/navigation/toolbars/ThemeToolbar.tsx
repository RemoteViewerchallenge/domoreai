
import React from 'react';
import { Palette, Type, Shapes, Code } from 'lucide-react';

export const ThemeToolbar = () => {
  return (
    <div className="flex items-center justify-between w-full animate-in fade-in duration-300">
      
      {/* GROUP 1: Context */}
      <div className="flex items-center gap-3 pl-2">
        <span className="text-neutral-500 text-xs font-mono uppercase tracking-wider">
          Theme Engine
        </span>
      </div>

      {/* GROUP 2: Tabs (Center) */}
      <div className="flex items-center gap-6">
        <TabButton label="Colors" icon={<Palette size={14} />} active />
        <TabButton label="Typography" icon={<Type size={14} />} />
        <TabButton label="Radius" icon={<Shapes size={14} />} />
      </div>

      {/* GROUP 3: Actions (Right) */}
      <div className="flex items-center gap-2">
         <button className="text-neutral-400 hover:text-white text-xs font-mono flex items-center gap-2 px-3">
            <Code size={14} /> View CSS
         </button>
         <button className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-pink-500/20">
           PUBLISH THEME
         </button>
      </div>
    </div>
  );
};

const TabButton = ({ label, icon, active }: { label: string, icon: React.ReactNode, active?: boolean }) => (
  <button className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors ${
    active ? 'text-pink-500' : 'text-neutral-500 hover:text-neutral-300'
  }`}>
    {icon} {label}
  </button>
);
