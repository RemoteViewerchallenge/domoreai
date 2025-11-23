import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js'; // Your AG Grid
import { VisualQueryBuilder } from './VisualQueryBuilder.js'; // Your SQL Builder
import { AddProviderForm } from './AddProviderForm.js'; // Your Form
import { Database, Plus, Play, GitMerge, ArrowRight, Table } from 'lucide-react';

export const DataNode: React.FC = () => {
  // --- STATE ---
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  
  // --- DATA ---
  const { data: tables, refetch: refetchTables } = trpc.dataRefinement.listAllTables.useQuery();
  const { data: tableData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable || '', limit: 1000 },
    { enabled: !!activeTable }
  );

  // --- MUTATIONS ---
  // 1. The "Zero-Touch" Provider Add
  const addProviderMutation = trpc.dataRefinement.addProviderAndIngest.useMutation({
    onSuccess: (data: { tableName: string }) => {
      refetchTables();
      setActiveTable(data.tableName); // Automatically jump to the new table
      setShowAddProvider(false);
    }
  });

  // 2. The "Transformation" (Query -> New Table)
  const saveQueryMutation = trpc.dataRefinement.saveQueryResults.useMutation({
    onSuccess: (_data: unknown, variables: { newTableName: string }) => {
      refetchTables();
      setActiveTable(variables.newTableName); // Jump to the new snapshot
      setShowQuery(false);
    }
  });

  // 3. The "Merge" (Promote to App)
  const promoteMutation = trpc.dataRefinement.promoteToApp.useMutation({
    onSuccess: (data: { count: number }) => alert(`Promoted ${data.count} models to the App!`)
  });

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
      
      {/* --- 1. HEADER TOOLBAR --- */}
      <div className="flex-none h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3">
        
        {/* Left: Table Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black px-2 py-1 rounded border border-zinc-800">
            <Database size={12} className="text-cyan-500" />
            <select 
              className="bg-transparent text-zinc-300 outline-none appearance-none cursor-pointer min-w-[120px]"
              value={activeTable || ''}
              onChange={(e) => setActiveTable(e.target.value)}
            >
              <option value="" disabled>Select Node...</option>
              {tables?.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setShowAddProvider(true)}
            className="p-1 hover:bg-zinc-800 rounded text-green-400 hover:text-green-300"
            title="Add Provider Source"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Center: Transformation Tools */}
        {activeTable && (
           <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowQuery(!showQuery)}
                className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${showQuery ? 'bg-purple-900/50 text-purple-300' : 'hover:bg-zinc-800 text-zinc-400'}`}
              >
                <Play size={12} /> TRANSFORM
              </button>
              <ArrowRight size={12} className="text-zinc-700" />
              <button 
                 onClick={() => promoteMutation.mutate({ sourceTableName: activeTable! })}
                 className="flex items-center gap-1 px-3 py-1 hover:bg-blue-900/30 text-blue-400 rounded transition-colors"
                 title="Merge into App Schema"
              >
                <GitMerge size={12} /> PROMOTE
              </button>
           </div>
        )}
      </div>

      {/* --- 2. WORKSPACE AREA --- */}
      <div className="flex-1 relative overflow-hidden bg-black">
        
        {/* A. Add Provider Modal (Inline) */}
        {showAddProvider && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
             <div className="w-96 bg-zinc-900 border border-zinc-700 rounded shadow-2xl p-4">
                <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                  <Plus size={14} className="text-green-400"/> New Data Source
                </h3>
                {/* Reuse your form, but hook it to our new mutation */}
                <AddProviderForm 
                  customMutation={addProviderMutation} // Pass the specialized mutation
                  onCancel={() => setShowAddProvider(false)}
                />
             </div>
          </div>
        )}

        {/* B. Query Builder (The "Scripting" Layer) */}
        {showQuery && activeTable && (
          <div className="absolute top-0 left-0 right-0 z-40 shadow-xl">
             <VisualQueryBuilder 
               tables={[activeTable]} 
               // This allows "Preview" in the builder itself
               onExecute={(sql: string) => console.log("Previewing:", sql)} 
               // This creates the NEW node
               onSaveTable={(sql: string, name: string) => saveQueryMutation.mutate({ query: sql, newTableName: name })}
             />
          </div>
        )}

        {/* C. Main Data Grid */}
        {activeTable ? (
          <UniversalDataGrid 
            data={(tableData?.rows as Record<string, unknown>[]) || []}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2">
            <Table size={48} className="opacity-20" />
            <p>Select or Add a Data Node</p>
          </div>
        )}

      </div>
    </div>
  );
};
