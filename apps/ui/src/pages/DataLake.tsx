import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from '../components/UniversalDataGrid.js';
import { VisualQueryBuilder } from '../components/VisualQueryBuilder.js';
import { JsonImportModal } from '../components/JsonImportModal.js';
import { Trash2, Database, X, Upload } from 'lucide-react';

const DataLake: React.FC = () => {
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [customData, setCustomData] = useState<any[] | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flattened' | 'all'>('all');
  const [showImportModal, setShowImportModal] = useState(false);

  const utils = trpc.useContext();

  // Data Hooks
  const { data: tables } = trpc.dataRefinement.listAllTables.useQuery();
  const { data: allTables } = trpc.dataRefinement.listAllTables.useQuery();
  const { data: tableData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: selectedTable || '', limit: 1000 },
    { enabled: !!selectedTable }
  );

  const dropTableMutation = trpc.dataRefinement.deleteTable.useMutation({
    onSuccess: () => {
      setSelectedTable(null);
      utils.dataRefinement.listAllTables.invalidate();
    },
    onError: (error) => alert(`Drop failed: ${error.message}`),
  });

  const autoFlattenMutation = trpc.dataRefinement.flattenRawData.useMutation({
    onSuccess: () => {
      utils.dataRefinement.listAllTables.invalidate();
      alert("Table Created!");
    },
    onError: (e) => alert("Error: " + e.message)
  });

  const executeMutation = trpc.dataRefinement.executeQuery.useMutation({
    onSuccess: (data) => setCustomData(data.rows as any[])
  });

  const saveTableMutation = trpc.dataRefinement.saveQueryResults.useMutation({
    onSuccess: () => {
      alert('Table saved successfully!');
      utils.dataRefinement.listAllTables.invalidate();
    }
  });

  return (
    <div className="h-screen flex flex-col bg-black text-gray-100 font-mono text-xs">
      
      {/* Header */}
      <div className="flex-none h-12 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-cyan-500" size={16} />
          <span className="text-lg font-bold tracking-wider text-zinc-200">DATA LAKE</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowQueryBuilder(!showQueryBuilder)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors text-xs"
          >
            {showQueryBuilder ? 'Hide Query Tool' : 'Open Query Tool'}
          </button>

          <button 
            onClick={() => {
              const name = prompt("Name for new table?", "all_models_flat");
              if (name) autoFlattenMutation.mutate({ tableName: name });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-700 rounded transition-colors text-xs"
          >
            AUTO-CONVERT TO TABLE
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700 rounded transition-colors text-xs"
          >
            <Upload size={14} /> IMPORT FROM JSON
          </button>
        </div>
      </div>

      {/* Query Builder Area */}
      {showQueryBuilder && (
        <div className="flex-none animate-in slide-in-from-top-2 fade-in duration-200">
           <VisualQueryBuilder 
             activeTable={selectedTable || 'RawDataLake'}
             onExecute={(sql: string) => executeMutation.mutate({ query: sql })}
             onSaveTable={(sql: string, name: string) => saveTableMutation.mutate({ query: sql, newTableName: name })}
             isLoading={executeMutation.isLoading}
           />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Table List */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase transition-colors ${
                viewMode === 'all' ? 'bg-zinc-800 text-cyan-400' : 'text-[var(--color-text-secondary)] hover:text-zinc-300'
              }`}
            >
              All Tables
            </button>
            <button
              onClick={() => setViewMode('flattened')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase transition-colors ${
                viewMode === 'flattened' ? 'bg-zinc-800 text-cyan-400' : 'text-[var(--color-text-secondary)] hover:text-zinc-300'
              }`}
            >
              Flattened
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(viewMode === 'all' ? allTables : tables?.map(t => t.name))?.map(tableName => {
              const protectedTables = ['_prisma_migrations', 'User', 'Session'];
              const canDelete = !protectedTables.includes(tableName);
              
              return (
                <div 
                  key={tableName} 
                  className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${selectedTable === tableName ? 'bg-zinc-800 text-cyan-400' : 'hover:bg-zinc-900 text-[var(--color-text-secondary)]'}`}
                  onClick={() => {
                    setSelectedTable(tableName);
                    setCustomData(null); // Clear custom query results when selecting a table
                  }}
                >
                  <span className="truncate text-white">{tableName}</span>
                
                  {canDelete && (
                    <button 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete table "${tableName}"? This cannot be undone.`)) {
                          dropTableMutation.mutate({ tableName });
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Area: The Table View or Query Interface */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {customData ? (
             <div className="absolute inset-0 bg-black">
                <div className="p-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-400">QUERY RESULTS</span>
                  <button onClick={() => setCustomData(null)} className="text-xs text-[var(--color-text-secondary)] hover:text-white">
                    <X size={14} /> Close Results
                  </button>
                </div>
                <UniversalDataGrid data={customData} />
             </div>
          ) : selectedTable && tableData ? (
            <div className="absolute inset-0">
               <UniversalDataGrid data={tableData.rows} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 space-y-4">
              <Database size={48} className="opacity-20" />
              <p className="text-white">Select a table or run a query to view data</p>
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <JsonImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={(newTableName) => {
            utils.dataRefinement.listAllTables.invalidate();
            setSelectedTable(newTableName);
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
};

export default DataLake;
