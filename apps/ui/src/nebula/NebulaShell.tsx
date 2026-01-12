import React, { useState } from 'react';
import { Activity, Database, Smartphone, Layout, Play, Code } from 'lucide-react';
import { cn } from '../lib/utils.js';
import AgentWorkbench from '../pages/AgentWorkbench.js';
import { NebulaRenderer } from '../features/nebula-renderer/NebulaRenderer.js';
import crmProject from '../data/projects/crm.json';

type ActiveMode = 'workbench' | 'builder' | 'preview';

export function NebulaShell() {
  const [activeMode, setActiveMode] = useState<ActiveMode>('workbench');
  const [currentProject] = useState(crmProject);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white font-sans">
      {/* LEFT DOCK */}
      <aside className="w-16 border-r border-zinc-800 flex flex-col items-center py-4 gap-6 bg-zinc-900/50 backdrop-blur-md z-50">
        <div className="p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20 mb-4">
          <Layout size={24} className="text-white" />
        </div>
        
        <DockItem 
          icon={<Activity size={20} />} 
          active={activeMode === 'workbench'} 
          onClick={() => setActiveMode('workbench')}
          label="Workbench"
        />
        <DockItem 
          icon={<Code size={20} />} 
          active={activeMode === 'builder'} 
          onClick={() => setActiveMode('builder')}
          label="Builder"
        />
        <DockItem 
          icon={<Play size={20} />} 
          active={activeMode === 'preview'} 
          onClick={() => setActiveMode('preview')}
          label="Preview"
        />
        
        <div className="mt-auto flex flex-col gap-6">
           <DockItem icon={<Database size={20} />} label="Data" />
           <DockItem icon={<Smartphone size={20} />} label="Devices" />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeMode === 'workbench' && (
          <div className="h-full w-full">
            <AgentWorkbench />
          </div>
        )}

        {activeMode === 'preview' && (
          <div className="flex-1 bg-zinc-100 p-8 flex items-center justify-center overflow-auto">
             {/* SIMULATOR CONTAINER */}
             <div className="w-full max-w-4xl h-full max-h-[800px] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
                <div className="h-10 bg-zinc-100 border-b border-zinc-200 flex items-center px-4 gap-2">
                   <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                   </div>
                   <div className="mx-auto bg-white border border-zinc-200 text-[10px] px-4 py-0.5 rounded-full text-zinc-400">
                      nebula://{currentProject.name.toLowerCase().replace(' ', '-')}.app
                   </div>
                </div>
                <div className="flex-1 overflow-auto">
                   <NebulaRenderer node={currentProject.layout as any} />
                </div>
             </div>
          </div>
        )}

        {activeMode === 'builder' && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-zinc-950">
            <div className="text-center">
              <Code size={48} className="mx-auto mb-4 opacity-20" />
              <h2 className="text-xl font-medium">Nebula Builder</h2>
              <p className="text-sm opacity-50">Visual editing is coming soon...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DockItem({ icon, active, onClick, label }: { icon: React.ReactNode, active?: boolean, onClick?: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
        active 
          ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-inner shadow-purple-500/10" 
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
      )}
    >
      {icon}
      
      {/* TOOLTIP */}
      <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-[10px] text-zinc-200 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-zinc-700 font-medium translate-x-1 group-hover:translate-x-0 transition-all shadow-xl z-[100]">
        {label}
      </div>

      {/* ACTIVE INDICATOR */}
      {active && (
        <div className="absolute -left-3 w-1 h-6 bg-purple-500 rounded-r-full shadow-lg shadow-purple-500/50" />
      )}
    </button>
  );
}
