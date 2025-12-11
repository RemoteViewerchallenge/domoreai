import { useState } from 'react';
import RoleCreatorPanel from '../features/creator-studio/RoleCreatorPanel.js';
import { OrchestrationDesigner } from '../features/creator-studio/OrchestrationDesigner.js';
import { Users, Workflow } from 'lucide-react';

export default function CreatorStudio() {
  const [activeTab, setActiveTab] = useState<'roles' | 'orchestrations'>('roles');

  return (
    <div className="flex-1 w-full bg-[var(--color-background)] text-[var(--color-text)] flex flex-col overflow-hidden font-mono">
      {/* Tab Switcher Header */}
      <div className="flex-none h-10 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-center px-4">

        <div className="flex bg-[var(--color-background)] rounded p-1 border border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'roles'
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Users size={14} />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('orchestrations')}
            className={`flex items-center gap-2 px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'orchestrations'
                ? 'bg-[var(--color-secondary)] text-black shadow-[var(--glow-secondary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Workflow size={14} />
            Orchestrations
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Role Creator Layer */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          activeTab === 'roles' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          <RoleCreatorPanel className="h-full w-full" />
        </div>

        {/* Orchestration Creator Layer */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          activeTab === 'orchestrations' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          <OrchestrationDesigner />
        </div>
      </div>
    </div>
  );
}
