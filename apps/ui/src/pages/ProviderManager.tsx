import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderList } from '../components/ProviderList.js';
import { DataNode } from '../components/DataNode.js';
// 1. Import the Database Manager
import { DatabaseManagerNode } from '../components/nodes/DatabaseManagerNode.js'; 
import { ApiExplorerNode } from '../components/nodes/ApiExplorerNode.js';
import { Layers, Database, Globe, Table } from 'lucide-react';

const ProviderManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  // 2. Add View Mode State
  const [viewMode, setViewMode] = useState<'refine' | 'manage'>('refine');
  
  const utils = trpc.useContext();
  trpc.providers.list.useQuery();
  
  const debugFetchMutation = trpc.providers.debugFetch.useMutation({
    onSuccess: () => alert('Ingestion Started. Check Data Node below.'),
    onError: (e) => alert(e.message)
  });

  return (
    <div className="h-screen w-full flex flex-col bg-black text-zinc-300 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex-none h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-3">
          <Layers className="text-cyan-500" size={24} />
          <h1 className="text-xl font-bold text-white tracking-wider">PROVIDER & MODEL INTEGRATION</h1>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase tracking-widest"
          >
            {showAddForm ? 'Close Form' : 'Add API Key'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL (Config) */}
        <div className="w-[350px] flex-none border-r border-zinc-800 flex flex-col bg-zinc-950/50 overflow-y-auto">
          {showAddForm && (
            <div className="p-4 border-b border-zinc-800 bg-zinc-900">
               <AddProviderForm onSuccess={() => {
                  utils.providers.list.invalidate();
                  setShowAddForm(false);
               }} />
            </div>
          )}
          <div className="p-4">
            <span className="text-xs font-bold text-zinc-500 mb-4 block">ACTIVE PROVIDERS</span>
            <ProviderList 
              onIngest={(id) => debugFetchMutation.mutate({ providerId: id })}
              onSelect={(id) => console.log("Selected", id)}
            />
          </div>
          <div className="flex-1 border-t border-zinc-800 p-4 flex flex-col">
             <div className="flex items-center gap-2 mb-4 text-zinc-400">
                <Globe size={16} />
                <span className="text-xs font-bold">QUICK API TEST</span>
             </div>
             <div className="flex-1 overflow-hidden border border-zinc-800 rounded-lg bg-black">
                <ApiExplorerNode /> 
             </div>
          </div>
        </div>

        {/* RIGHT PANEL (Workbench) */}
        <div className="flex-1 flex flex-col bg-black relative">
           
           {/* 3. MODE SWITCHER OVERLAY */}
           <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none p-4 flex justify-center">
              <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-1 rounded-full flex shadow-xl pointer-events-auto">
                 <button
                   onClick={() => setViewMode('refine')}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'refine' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                 >
                    <Database size={14} /> Refinement Node
                 </button>
                 <button
                   onClick={() => setViewMode('manage')}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'manage' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                 >
                    <Table size={14} /> DB Manager
                 </button>
              </div>
           </div>

           {/* 4. RENDER SELECTED NODE */}
           <div className="flex-1 p-4 pt-16">
              {viewMode === 'refine' ? (
                <DataNode />
              ) : (
                // This is the component that allows you to edit/delete any table
                <DatabaseManagerNode />
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProviderManager;