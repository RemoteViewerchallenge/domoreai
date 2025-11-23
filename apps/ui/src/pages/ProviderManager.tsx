import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderList } from '../components/ProviderList.js';
import { DatabaseManagerNode } from '../components/nodes/DatabaseManagerNode.js'; // Import the new node
import { ApiExplorerNode } from '../components/nodes/ApiExplorerNode.js'; // Import the new node
import { Layers, Database, Globe } from 'lucide-react';

const ProviderManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const utils = trpc.useContext();
  
  trpc.providers.list.useQuery();
  
  const debugFetchMutation = trpc.providers.debugFetch.useMutation({
    onSuccess: () => alert('Ingestion Started. Check Data Lake table.'),
    onError: (e) => alert(e.message)
  });

  return (
    <div className="h-screen w-full flex flex-col bg-black text-zinc-300 overflow-y-auto scrollbar-thin">
      
      {/* --- SECTION 1: PROVIDER CONFIGURATION --- */}
      <div className="p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="text-cyan-500" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-wider">PROVIDER CONFIGURATION</h1>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase tracking-widest"
          >
            {showAddForm ? 'Close Form' : 'Add New Provider'}
          </button>
        </div>

        {/* Add Form Area */}
        {showAddForm && (
          <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
             <AddProviderForm onSuccess={() => {
                utils.providers.list.invalidate();
                setShowAddForm(false);
             }} />
          </div>
        )}

        {/* Provider List */}
        <div className="mb-12">
          <ProviderList 
            onIngest={(id) => debugFetchMutation.mutate({ providerId: id })}
            onSelect={(id) => console.log("Selected", id)}
          />
        </div>

        {/* --- SECTION 2: DATA ALIGNMENT WORKBENCH --- */}
        <div className="border-t border-zinc-800 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Database Manager */}
           <div>
             <div className="flex items-center gap-3 mb-6">
                <Database className="text-purple-500" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wider">DATA ALIGNMENT WORKBENCH</h2>
                  <p className="text-xs text-zinc-500">Inspect raw data, execute SQL transformations, and sync schemas.</p>
                </div>
             </div>
             <DatabaseManagerNode />
           </div>

           {/* API Explorer */}
           <div>
             <div className="flex items-center gap-3 mb-6">
                <Globe className="text-blue-500" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wider">API EXPLORER</h2>
                  <p className="text-xs text-zinc-500">Test external APIs and save responses to the Data Lake.</p>
                </div>
             </div>
             <ApiExplorerNode />
           </div>

        </div>
      </div>
    </div>
  );
};

export default ProviderManager;