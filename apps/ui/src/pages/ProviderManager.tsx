import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderList } from '../components/ProviderList.js';
import { DataNode } from '../components/DataNode.js';
import { ApiExplorerNode } from '../components/nodes/ApiExplorerNode.js';
import { Layers, Database, Globe, ArrowRight } from 'lucide-react';

const ProviderManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const utils = trpc.useContext();
  
  // Prefetch providers
  trpc.providers.list.useQuery();
  
  const debugFetchMutation = trpc.providers.debugFetch.useMutation({
    onSuccess: () => alert('Ingestion Started. Check Data Node below.'),
    onError: (e) => alert(e.message)
  });

  return (
    <div className="h-screen w-full flex flex-col bg-black text-zinc-300 overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="flex-none h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-3">
          <Layers className="text-cyan-500" size={24} />
          <h1 className="text-xl font-bold text-white tracking-wider">PROVIDER & MODEL INTEGRATION</h1>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            {showAddForm ? 'Close Form' : 'Add API Key'}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT (Split View) --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Configuration & API Keys (30% Width) */}
        <div className="w-[350px] flex-none border-r border-zinc-800 flex flex-col bg-zinc-950/50 overflow-y-auto">
          
          {/* Add Form (Inline) */}
          {showAddForm && (
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 animate-in slide-in-from-top-2">
               <AddProviderForm onSuccess={() => {
                  utils.providers.list.invalidate();
                  setShowAddForm(false);
               }} />
            </div>
          )}

          {/* List */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-zinc-500">ACTIVE PROVIDERS</span>
            </div>
            <ProviderList 
              onIngest={(id) => debugFetchMutation.mutate({ providerId: id })}
              onSelect={(id) => console.log("Selected", id)}
            />
          </div>

          {/* API Explorer (Mini) */}
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

        {/* RIGHT: The Data Node (70% Width - The "Workbench") */}
        <div className="flex-1 flex flex-col bg-black relative">
           {/* Overlay Header for Context */}
           <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none p-4 flex justify-center">
              <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 px-4 py-1 rounded-full flex items-center gap-3 shadow-xl">
                 <Database size={14} className="text-purple-400" />
                 <span className="text-xs font-mono text-zinc-300">
                    1. FETCH RAW <ArrowRight size={10} className="inline mx-1"/> 2. TRANSFORM SQL <ArrowRight size={10} className="inline mx-1"/> 3. PROMOTE TO APP
                 </span>
              </div>
           </div>

           {/* The Data Node Component - Full Height */}
           <div className="flex-1 p-4 pt-12">
              <DataNode />
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProviderManager;