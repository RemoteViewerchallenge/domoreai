import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js';
import { VisualQueryBuilder } from './VisualQueryBuilder.js';
import { AddProviderForm } from './AddProviderForm.js';
import { 
  Database, Table, Trash2, Play, FileJson, 
  Search, RefreshCw, Plus, Crown, Download, Upload 
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
  const [jsonViewerData, setJsonViewerData] = useState<any>(null);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [tempQueryResults, setTempQueryResults] = useState<Record<string, unknown>[] | null>(null);
  const importTableFromJsonMutation = trpc.dataRefinement.importJsonToTable.useMutation({
    onSuccess: (data) => {
      alert(`Successfully imported ${data.rowCount} rows into table "${data.tableName}".`);
      refetchTables();
      refetchData();
    },
    onError: (error) => {
      alert(`Import failed: ${error.message}`);
    },
  });

  // --- API ---
  const { data: tables, refetch: refetchTables } = trpc.dataRefinement.listAllTables.useQuery();
  const { data: tableData, refetch: refetchData, isLoading: isTableDataLoading } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable || '', limit: 1000 },
    { enabled: !!activeTable }
  );

  // --- MUTATIONS ---
  const exportTableToJson = trpc.dataRefinement.exportTableToJson.useMutation();

  const handleExport = async () => {
    if (!activeTable) return;
    try {
      const result = await exportTableToJson.mutateAsync({ tableName: activeTable });
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(result.jsonString)}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `${activeTable}.json`;
      link.click();
    } catch (error) {
      alert(`Export failed: ${(error as Error).message}`);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeTable) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') {
                throw new Error("File content is not a string");
            }
            // The backend will parse and validate the JSON string
            importTableFromJsonMutation.mutate({ tableName: activeTable, jsonString: content });
        } catch (error) {
            if (error instanceof Error) {
                alert(`Error reading or parsing file: ${error.message}`);
            } else {
                alert('An unknown error occurred during import.');
            }
        }
    };
    reader.readAsText(file);
    
    // Reset file input to allow importing the same file again
    event.target.value = '';
  };

  // Generic JSON viewer import/export
  const handleGenericJsonImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') throw new Error('File content is not a string');
        const data = JSON.parse(content);
        setJsonViewerData(data);
        setShowJsonViewer(true);
        setActiveTable(null); // Deselect table
      } catch (error) {
        alert(`Error: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleGenericJsonExport = () => {
    if (!jsonViewerData) return;
    const jsonString = JSON.stringify(jsonViewerData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
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

  // 4. Execute Query (creates temp table with results)
  const executeQueryMutation = trpc.dataRefinement.executeQuery.useMutation({
    onSuccess: (data) => {
      // Create a temporary view of the results
      setTempQueryResults(data.rows as Record<string, unknown>[]);
      alert(`Query executed successfully! ${data.rowCount} rows returned.`);
    },
    onError: (err) => alert(`Query failed: ${err.message}`)
  });

  // 5. Save Query Result
  const saveQueryMutation = trpc.dataRefinement.saveQueryResults.useMutation({
    onSuccess: (_data, vars) => {
      refetchTables();
      setActiveTable(vars.newTableName);
      setShowQuery(false);
    }
  });



  // 6. Create Table
  const createTableMutation = trpc.dataRefinement.createTable.useMutation({
    onSuccess: (_data, vars) => {
      refetchTables();
      setActiveTable(vars.tableName);
    }
  });

  // 10. Set Active Registry
  const setActiveRegistryMutation = trpc.orchestrator.setActiveRegistry.useMutation({
    onSuccess: (_data, vars) => {
      alert(`✅ Active Registry set to: ${vars.tableName}`);
    }
  });

  // 8. Save Migration Query
  const saveMigrationQueryMutation = trpc.dataRefinement.saveMigrationQuery.useMutation({
    onSuccess: () => alert("Query Saved!")
  });

  // 9. Delete Saved Query
  const deleteSavedQueryMutation = trpc.dataRefinement.deleteSavedQuery.useMutation({
    onSuccess: () => {
      refetchSavedQueries();
    }
  });

  // Fetch Saved Queries
  const { 
    data: savedQueries, 
    isLoading: isLoadingSavedQueries, 
    error: savedQueriesError, 
    refetch: refetchSavedQueries 
  } = trpc.dataRefinement.listSavedQueries.useQuery();

  // Filter tables for sidebar
  const filteredTables = tables?.filter((t: TableItem) => 
    t.name.toLowerCase().includes(filterText.toLowerCase())
  ) || [];
  
  const regularTables = filteredTables.filter(t => t.name !== 'RawDataLake');
  const rawDataLakeTable = filteredTables.find(t => t.name === 'RawDataLake');

  const handleCreateTable = () => {
    const name = prompt("Enter new table name:");
    if (name) createTableMutation.mutate({ tableName: name });
  };


  return (
    <div className="flex h-full w-full bg-black border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs shadow-2xl">
      
      {/* --- SIDEBAR: TABLE LIST --- */}
      <div className="w-64 flex-none border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-zinc-800">
           <span className="font-bold text-[var(--color-text-secondary)]">EXPLORER</span>
           
           {/* DATABASE OPERATIONS */}
           <div className="mt-3">
             <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Database Tables</div>
             <div className="flex items-center gap-1">
               <button 
                 onClick={handleCreateTable}
                 className="flex-1 p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-zinc-200 text-[10px]" 
                 title="New Empty Table"
               >
                 <Table size={12} className="inline mr-1" /> New
               </button>
               <button 
                 onClick={() => setShowImportJsonModal(true)}
                 className="flex-1 p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-zinc-200 text-[10px]" 
                 title="Create Table from JSON Array"
               >
                 <FileJson size={12} className="inline mr-1" /> Import
               </button>
             </div>
           </div>

           {/* JSON FILE VIEWER */}
           <div className="mt-3 pt-3 border-t border-zinc-800">
             <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">JSON Viewer</div>
             <div className="flex items-center gap-1">
               <button 
                 onClick={() => document.getElementById('generic-json-import')?.click()}
                 className="flex-1 p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-zinc-200 text-[10px]" 
                 title="Open Any JSON File"
               >
                 <Upload size={12} className="inline mr-1" /> Open
               </button>
               {showJsonViewer && jsonViewerData && (
                 <button 
                   onClick={handleGenericJsonExport}
                   className="flex-1 p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-zinc-200 text-[10px]" 
                   title="Download JSON"
                 >
                   <Download size={12} className="inline mr-1" /> Save
                 </button>
               )}
             </div>
           </div>
           <input 
             type="file" 
             id="generic-json-import" 
             accept=".json" 
             className="hidden" 
             onChange={handleGenericJsonImport} 
           />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2 mb-2 mt-2">Database Tables</div>
          {regularTables
            .map((t: TableItem) => (
              <button
                key={t.name}
                onClick={() => {
                  setActiveTable(t.name);
                  setTempQueryResults(null); // Clear temp results when changing tables
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${
                  activeTable === t.name 
                    ? 'bg-cyan-900/30 text-cyan-200 border border-cyan-900/50' 
                    : 'text-[var(--color-text-secondary)] hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Table size={14} />
                <span className="truncate">{t.name}</span>
              </button>
            ))}

          {rawDataLakeTable && (
            <>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2 mb-2 mt-4 pt-2 border-t border-zinc-800/50">System Tables</div>
              <button
                key={rawDataLakeTable.name}
                onClick={() => {
                  setActiveTable(rawDataLakeTable.name);
                  setTempQueryResults(null);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${
                  activeTable === rawDataLakeTable.name 
                    ? 'bg-purple-900/30 text-purple-200 border border-purple-900/50' 
                    : 'text-[var(--color-text-secondary)] hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Database size={14} />
                <span className="truncate">{rawDataLakeTable.name}</span>
              </button>
            </>
          )}

        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        
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
                 <span className="text-[var(--color-text-secondary)]">No Table Selected</span>
               )}
             </h2>
             {activeTable && (
               <button onClick={() => refetchData()} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)]">
                 <RefreshCw size={12} />
               </button>
             )}
          </div>

          {/* Actions */}
          {activeTable && (
            <div className="flex items-center gap-2">

               <button 
                 onClick={() => setShowQuery(!showQuery)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${showQuery ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent hover:bg-zinc-900 text-[var(--color-text-secondary)]'}`}
               >
                 <Play size={14} /> SQL EDITOR
               </button>

               <>
                 <button
                   onClick={() => handleExport()}
                   className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow-lg"
                   title={`Export "${activeTable}" to a JSON file`}
                 >
                   <FileJson size={14} /> EXPORT
                 </button>

                 <button
                   onClick={() => document.getElementById('import-input')?.click()}
                   className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold shadow-lg"
                   title={`Import data from a JSON file into "${activeTable}"`}
                 >
                   <FileJson size={14} /> IMPORT
                 </button>
                 <input type="file" id="import-input" accept=".json" className="hidden" onChange={handleImport} />
               </>

               <button 
                 onClick={() => {
                   if (!activeTable) return;
                   if (confirm(`Set "${activeTable}" as the Active Model Registry?\n\nThe Role Creator will now adapt to the schema of this table.`)) {
                     setActiveRegistryMutation.mutate({ tableName: activeTable });
                   }
                 }}
                 className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded font-bold shadow-lg"
                 title="Make this table the source of truth for the application"
               >
                 <Crown size={14} /> SET AS ACTIVE REGISTRY
               </button>

               <div className="h-4 w-px bg-zinc-800 mx-1" />

               <button 
                 onClick={() => { if(confirm('Delete this table?')) deleteTableMutation.mutate({ tableName: activeTable }) }}
                 className="p-2 hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-400 rounded transition-colors"
                 title="Delete Table"
               >
                 <Trash2 size={14} />
               </button>
            </div>
          )}
        </div>

        {/* 2. DATA GRID (Fills available space) */}
        <div className="flex-1 overflow-hidden relative">
          {tempQueryResults && (
            <div className="absolute top-0 left-0 right-0 z-10 h-10 bg-yellow-900/20 border-b border-yellow-800 flex items-center justify-between px-4 animate-in fade-in">
              <span className="text-yellow-300 font-bold text-xs">
                Showing temporary query results.
              </span>
              <button 
                onClick={() => setTempQueryResults(null)}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs font-bold"
              >
                Clear Results & View Original Table
              </button>
            </div>
          )}
          {activeTable ? (
            <UniversalDataGrid 
              data={tempQueryResults || (tableData?.rows as Record<string, unknown>[]) || []} 
            />
          ) : showJsonViewer && jsonViewerData ? (
            <div className="h-full overflow-auto p-4 bg-zinc-950">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-zinc-400 font-bold">JSON Viewer</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const tableName = prompt('Enter table name to import this JSON as:');
                      if (tableName) {
                        importTableFromJsonMutation.mutate({ 
                          tableName, 
                          jsonString: JSON.stringify(jsonViewerData) 
                        });
                      }
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold"
                  >
                    Import to Table
                  </button>
                  <button 
                    onClick={handleGenericJsonExport}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
                  >
                    Export JSON
                  </button>
                  <button 
                    onClick={() => { setShowJsonViewer(false); setJsonViewerData(null); }}
                    className="text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
              <pre className="text-[10px] text-zinc-300 bg-black p-4 rounded border border-zinc-800 overflow-auto">
                {JSON.stringify(jsonViewerData, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700">
              <Database size={64} className="opacity-10 mb-4" />
              <p>Select a table or open a JSON file</p>
            </div>
          )}
        </div>

        {/* 3. SQL EDITOR (Bottom Panel - Resizable-ish) */}
        {showQuery && (
          <div className="flex-none h-[450px] border-t border-zinc-800 bg-zinc-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10">
             <VisualQueryBuilder 
               activeTable={activeTable || ''}
               onDeleteTable={() => {}} // Handled in toolbar now
               onExecute={(sql) => executeQueryMutation.mutate({ query: sql })}
               onSaveTable={(sql, name) => saveQueryMutation.mutate({ query: sql, newTableName: name })}
               onSaveQuery={(sql, name) => {
                 saveMigrationQueryMutation.mutate({ name, query: sql }, {
                   onSuccess: () => refetchSavedQueries()
                 });
               }}
               savedQueries={savedQueries || []}
               onDeleteQuery={(name) => deleteSavedQueryMutation.mutate({ name })}
               onRefreshSaved={() => refetchSavedQueries()}
               isLoading={isLoadingSavedQueries}
               error={savedQueriesError}
             />
          </div>
        )}

      </div>
    </div>
  );
};
