import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js';
import { VisualQueryBuilder } from './VisualQueryBuilder.js';
import { AddProviderForm } from './AddProviderForm.js';
import { 
  Database, Table, Trash2, Play, FileJson, 
  Search, RefreshCw, Plus 
} from 'lucide-react';

interface TableItem {
  name: string;
  type: string;
}

export const DataNode: React.FC = () => {
  // --- STATE ---
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [showQuery, setShowQuery] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);

  // --- API ---
  const { data: tables, refetch: refetchTables } = trpc.dataRefinement.listAllTables.useQuery();
  const { data: tableData, refetch: refetchData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable || '', limit: 1000 },
    { enabled: !!activeTable }
  );

  // --- MUTATIONS ---
  
  // 1. Add Provider (DO IT ALL)
  const addProviderMutation = trpc.dataRefinement.addProviderAndIngest.useMutation({
    onSuccess: (data) => {
      refetchTables();
      setActiveTable(data.tableName); 
      setShowAddProvider(false);
    }
  });

  // 2. Manual Flatten (If needed)
  const flattenMutation = trpc.dataRefinement.flattenRawData.useMutation({
    onSuccess: (data) => {
      refetchTables();
      setActiveTable(data.tableName); // Jump to the new clean table
    }
  });

  // 3. Delete Table
  const deleteTableMutation = trpc.dataRefinement.deleteTable.useMutation({
    onSuccess: () => {
      setActiveTable(null);
      refetchTables();
    }
  });

  // 4. Save Query Result
  const saveQueryMutation = trpc.dataRefinement.saveQueryResults.useMutation({
    onSuccess: (_data, vars) => {
      refetchTables();
      setActiveTable(vars.newTableName);
      setShowQuery(false);
    }
  });

  // 5. Edit Cell
  const updateCellMutation = trpc.dataRefinement.updateCell.useMutation({
    onSuccess: () => { /* Silent success */ },
    onError: (err) => alert(`Edit failed: ${err.message}`)
  });

  // Filter tables for sidebar
  const filteredTables = tables?.filter((t: TableItem) => 
    t.name.toLowerCase().includes(filterText.toLowerCase())
  ) || [];

  return (
    <div className="flex h-full w-full bg-black border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs shadow-2xl">
      
      {/* --- SIDEBAR: TABLE LIST --- */}
      <div className="w-64 flex-none border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Header / Add Provider */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
           <span className="font-bold text-zinc-400">EXPLORER</span>
           <button 
             onClick={() => setShowAddProvider(true)}
             className="p-1 hover:bg-zinc-800 rounded text-green-400" 
             title="Add Data Source"
           >
             <Plus size={14} />
           </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800">
            <Search size={12} className="text-zinc-500" />
            <input 
              className="bg-transparent outline-none text-zinc-300 w-full placeholder-zinc-600"
              placeholder="Search tables..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2 mb-2 mt-2">Database Tables</div>
          {filteredTables.map((t: TableItem) => (
            <button
              key={t.name}
              onClick={() => setActiveTable(t.name)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${
                activeTable === t.name 
                  ? 'bg-cyan-900/30 text-cyan-200 border border-cyan-900/50' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              {t.name === 'RawDataLake' ? <Database size={14} className="text-purple-400"/> : <Table size={14} />}
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        
        {/* A. ADD MODAL */}
        {showAddProvider && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
             <div className="w-96 bg-zinc-900 border border-zinc-700 rounded shadow-2xl p-4">
                <AddProviderForm customMutation={addProviderMutation} onCancel={() => setShowAddProvider(false)} />
             </div>
          </div>
        )}

        {/* 1. TOOLBAR */}
        <div className="flex-none h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur">
          <div className="flex items-center gap-3">
             <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
               {activeTable ? (
                 <>
                   <Table size={16} className="text-cyan-500" />
                   {activeTable}
                 </>
               ) : (
                 <span className="text-zinc-500">No Table Selected</span>
               )}
             </h2>
             {activeTable && (
               <button onClick={() => refetchData()} className="p-1 hover:bg-zinc-800 rounded text-zinc-500">
                 <RefreshCw size={12} />
               </button>
             )}
          </div>

          {/* Actions */}
          {activeTable && (
            <div className="flex items-center gap-2">
               {/* SPECIAL ACTION: IMPORT JSON (Only for Raw Data) */}
               {activeTable === 'RawDataLake' && (
                 <button 
                   onClick={() => flattenMutation.mutate({ tableName: activeTable })}
                   className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow-lg shadow-purple-900/20 mr-2"
                 >
                   <FileJson size={14} />
                   IMPORT TO TABLE
                 </button>
               )}

               <button 
                 onClick={() => setShowQuery(!showQuery)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${showQuery ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent hover:bg-zinc-900 text-zinc-400'}`}
               >
                 <Play size={14} /> SQL EDITOR
               </button>

               <div className="h-4 w-px bg-zinc-800 mx-1" />

               <button 
                 onClick={() => { if(confirm('Delete this table?')) deleteTableMutation.mutate({ tableName: activeTable }) }}
                 className="p-2 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 rounded transition-colors"
                 title="Delete Table"
               >
                 <Trash2 size={14} />
               </button>
            </div>
          )}
        </div>

        {/* 2. DATA GRID (Fills available space) */}
        <div className="flex-1 overflow-hidden relative">
          {activeTable ? (
            <UniversalDataGrid 
              data={(tableData?.rows as Record<string, unknown>[]) || []} 
              onEdit={(rowId, col, val) => {
                updateCellMutation.mutate({
                  tableName: activeTable,
                  rowId: rowId,
                  column: col,
                  value: val
                });
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 select-none">
              <Database size={64} className="opacity-10 mb-4" />
              <p>Select a table from the sidebar to browse data</p>
            </div>
          )}
        </div>

        {/* 3. SQL EDITOR (Bottom Panel - Resizable-ish) */}
        {showQuery && (
          <div className="flex-none h-[300px] border-t border-zinc-800 bg-zinc-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10">
             <VisualQueryBuilder 
               tables={tables?.map((t: TableItem) => t.name) || []}
               activeTable={activeTable || ''}
               onDeleteTable={() => {}} // Handled in toolbar now
               onExecute={(sql) => console.log("Preview:", sql)}
               onSaveTable={(sql, name) => saveQueryMutation.mutate({ query: sql, newTableName: name })}
             />
          </div>
        )}

      </div>
    </div>
  );
};
