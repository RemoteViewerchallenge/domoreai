import { useState } from 'react';
import RoleCreatorPanel from '../components/RoleCreatorPanel.js';
import OrchestrationCreatorPanel from '../components/OrchestrationCreatorPanel.js';
import { Users, Workflow } from 'lucide-react';

export default function CreatorStudio() {
  const [activeTab, setActiveTab] = useState<'roles' | 'orchestrations'>('roles');

  return (
    <div className="h-full w-full bg-black text-gray-100 flex flex-col overflow-hidden font-mono">
      {/* Tab Switcher Header */}
      <div className="flex-none h-10 border-b border-gray-800 bg-gray-950 flex items-center justify-center px-4">

        <div className="flex bg-gray-900 rounded p-1 border border-gray-800">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'roles'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Users size={14} />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('orchestrations')}
            className={`flex items-center gap-2 px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'orchestrations'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                : 'text-gray-500 hover:text-gray-300'
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
          <OrchestrationCreatorPanel className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
