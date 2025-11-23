import React, { useState } from 'react';
import { trpc } from '../../utils/trpc.js';
import { UniversalDataGrid } from '../UniversalDataGrid.js';
import { VisualQueryBuilder } from '../VisualQueryBuilder.js'; // Ensure this file exists from previous steps
import { Database, Trash2, RefreshCw, Play, Table } from 'lucide-react';

export const DatabaseManagerNode: React.FC = () => {
  const [activeTable, setActiveTable] = useState<string>('');
  const [showQuery, setShowQuery] = useState(false);
  const [customData, setCustomData] = useState<Record<string, unknown>[] | null>(null);

  const utils = trpc.useContext();
  const { data: tables } = trpc.dataRefinement.listAllTables.useQuery(); 
  const { data: tableData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable, limit: 500 },
    { enabled: !!activeTable }
  );
  
  const dropTableMutation = trpc.dataRefinement.dropTable.useMutation({
    onSuccess: () => {
        setActiveTable('');
        utils.dataRefinement.listAllTables.invalidate();
    }
  });

  const executeMutation = trpc.dataRefinement.executeQuery.useMutation({
    onSuccess: (data) => setCustomData(data as Record<string, unknown>[])
  });
  
  const syncSchemaMutation = trpc.dataRefinement.syncPrismaSchema.useMutation({
    onSuccess: () => alert("Prisma Schema Updated!")
  });

  return (
    <div className="flex flex-col h-[600px] w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
      
      {/* Header */}
      <div className="flex-none h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Database size={16} className="text-purple-500" />
            <span className="font-bold text-zinc-300 text-sm">DATABASE MANAGER</span>
            <select 
              value={activeTable} 
              onChange={(e) => { setActiveTable(e.target.value); setCustomData(null); }}
              className="bg-black border border-zinc-700 rounded px-3 py-1 text-zinc-300 outline-none ml-4"
            >
              <option value="" disabled>Select Table...</option>
              {tables?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
         </div>
         
         <div className="flex gap-2">
            <button 
               onClick={() => setShowQuery(!showQuery)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded ${showQuery ? 'bg-purple-900 text-purple-200' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
               <Play size={14} /> SQL Tool
            </button>
            
            {activeTable && (
                <button 
                onClick={() => {
                    if (confirm(`DROP TABLE ${activeTable}? This is irreversible.`)) dropTableMutation.mutate({ tableName: activeTable });
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded"
                >
                <Trash2 size={14} /> Drop
                </button>
            )}
            
            <button 
               onClick={() => syncSchemaMutation.mutate()}
               disabled={syncSchemaMutation.isLoading}
               className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded ml-2 border border-blue-800"
               title="Run 'prisma db pull' to update schema file"
            >
               <RefreshCw size={14} className={syncSchemaMutation.isLoading ? "animate-spin" : ""} /> 
               Sync Schema
            </button>
         </div>
      </div>

      {/* Query Builder Overlay */}
      {showQuery && (
        <div className="flex-none border-b border-zinc-800 animate-in slide-in-from-top-2">
           <VisualQueryBuilder 
             tables={tables || []}
             onExecute={(sql) => executeMutation.mutate({ query: sql })}
           />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-black">
         {customData ? (
            <UniversalDataGrid data={customData as Record<string, unknown>[]} />
         ) : activeTable && tableData ? (
            <UniversalDataGrid data={tableData.rows as Record<string, unknown>[]} />
         ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-800 gap-2">
               <Table size={48} className="opacity-20"/>
               <p className="font-bold">Select a table to view or edit data</p>
            </div>
         )}
      </div>
    </div>
  );
};
