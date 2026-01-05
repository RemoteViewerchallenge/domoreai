import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from '../components/UniversalDataGrid.js';

import { Database, Table, Search, Trash2, Upload, RefreshCw } from 'lucide-react';

export const DbBrowserPage: React.FC = () => {
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [importOptions, setImportOptions] = useState({ 
    allowReserved: false, 
    preserveIds: false, 
    preserveCreatedAt: false, 
    upsertOnConflict: false, 
    useStrictSchema: false,
    auditReason: '' 
  });

  // --- QUERIES ---
  const { data: tables, refetch: refetchTables } = trpc.schema.getTables.useQuery();
  const { data: tableData, refetch: refetchData, isLoading } = trpc.schema.getTableData.useQuery(
    { tableName: activeTable || '', limit: 1000 },
    { enabled: !!activeTable }
  );
  const { data: tableSchema } = trpc.schema.getTableSchema.useQuery(
    { tableName: activeTable || '' },
    { enabled: !!activeTable }
  );

  // --- MUTATIONS ---
  const importTableFromJsonMutation = trpc.schema.importJsonToTable.useMutation({
    onSuccess: (data) => {
      // eslint-disable-next-line react/no-unescaped-entities
      alert(`Import Successful!\n${data.rowCount} rows processed into '${data.tableName}'.`);
      void refetchTables();
      if (activeTable === data.tableName) void refetchData();
      else setActiveTable(data.tableName);
      setShowImportModal(false);
      setPendingImportJson(null);
    },
    // eslint-disable-next-line react/no-unescaped-entities
    onError: (error) => alert(`Import Failed: '${error.message}'`)
  });

  const deleteTableMutation = trpc.schema.dropTable.useMutation({
    onSuccess: () => {
      setActiveTable(null);
      void refetchTables();
    }
  });

  const createTableMutation = trpc.schema.createTable.useMutation({
    onSuccess: (_data, vars) => {
      void refetchTables();
      setActiveTable(vars.tableName);
    }
  });

  // --- HANDLERS ---
  const handleCreateTable = () => {
    const name = prompt("Enter new table name:");
    if (name) createTableMutation.mutate({ tableName: name });
  };

  const filteredTables = tables?.filter((t: string) => 
    t.toLowerCase().includes(filterText.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col flex-1 w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      <div className="flex h-full w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-64 flex-none border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-100">
              <Database className="text-blue-500" size={20} />
              DB Browser
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search tables..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-2 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button 
              onClick={handleCreateTable}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all text-xs mb-2"
            >
              + New Table
            </button>
            
            {filteredTables.map((t: string) => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                  activeTable === t 
                    ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Table size={14} />
                <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
          {activeTable ? (
            <>
              {/* Toolbar */}
              <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/40">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                    <Table className="text-blue-500" size={20} />
                    {activeTable}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">
                    {tableData?.rowCount || 0} rows
                  </span>
                  <button onClick={() => void refetchData()} title="Refresh Data" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <RefreshCw size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                        setPendingImportJson(''); 
                        setImportOptions({ 
                            allowReserved: false, 
                            preserveIds: false, 
                            preserveCreatedAt: false, 
                            upsertOnConflict: false, 
                            useStrictSchema: false,
                            auditReason: ''
                        });
                        setShowImportModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold shadow-lg text-xs transition-all"
                  >
                    <Upload size={14} /> Import Data
                  </button>
                  
                  <div className="h-6 w-px bg-zinc-800 mx-1" />
                  
                  <button 
                    onClick={() => { if(confirm(`Delete table "${activeTable}"? This cannot be undone.`)) deleteTableMutation.mutate({ tableName: activeTable }) }}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-all"
                    title="Delete Table"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-hidden relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-500">Loading data...</div>
                ) : (
                  <UniversalDataGrid 
                    data={(tableData?.rows as any[]) || []} 
                    headers={tableSchema?.map((c) => c.name) || []}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
              <Database size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a table to browse</p>
              <p className="text-sm">or create a new one to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h3 className="font-bold text-lg text-white">Import Data into "{activeTable}"</h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Presets */}
              <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">System Presets (Reason Recommended)</div>
                <div className="flex gap-3">
                   <button 
                     onClick={() => { 
                       setActiveTable('Role'); 
                       setImportOptions(p => ({ ...p, upsertOnConflict: true, preserveIds: true, useStrictSchema: true }));
                       alert("Set target to 'Role' with Strict Schema enabled.");
                     }} 
                     className="px-3 py-2 bg-zinc-800 hover:bg-blue-600/30 border border-zinc-700 hover:border-blue-500/50 rounded text-xs text-zinc-300 hover:text-blue-200 transition-all text-left"
                   >
                     <div className="font-bold">System Roles</div>
                     <div className="opacity-50 text-[10px]">Target: Role table</div>
                   </button>
                   <button 
                     onClick={() => { 
                       setActiveTable('Model'); 
                       setImportOptions(p => ({ ...p, upsertOnConflict: true, preserveIds: false, useStrictSchema: true }));
                       alert("Set target to 'Model' with Strict Schema enabled.");
                     }} 
                     className="px-3 py-2 bg-zinc-800 hover:bg-emerald-600/30 border border-zinc-700 hover:border-emerald-500/50 rounded text-xs text-zinc-300 hover:text-emerald-200 transition-all text-left"
                   >
                     <div className="font-bold">System Models</div>
                     <div className="opacity-50 text-[10px]">Target: Model</div>
                   </button>
                </div>
              </div>

              {/* Data Input */}
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Paste JSON Data</label>
                <textarea 
                  className="w-full h-48 bg-black/50 border border-zinc-700 rounded p-3 font-mono text-xs text-zinc-300 focus:border-blue-500 outline-none resize-none"
                  placeholder='[{"name": "...", ...}]'
                  value={pendingImportJson || ''}
                  onChange={e => setPendingImportJson(e.target.value)}
                />
                <div className="mt-2 flex items-center justify-between">
                   <input 
                     type="file" 
                     accept=".json" 
                     className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700" 
                     onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setPendingImportJson(ev.target?.result as string);
                        reader.readAsText(file);
                     }}
                   />
                   <span className="text-xs text-zinc-500">
                     {pendingImportJson ? `${pendingImportJson.length} characters` : 'No data'}
                   </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 border-t border-zinc-800 pt-4">
                <div className="text-xs font-bold text-zinc-500 mb-2">Advanced Options</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.useStrictSchema} onChange={e => setImportOptions({...importOptions, useStrictSchema: e.target.checked})} />
                  <span className="text-sm text-zinc-300">Use Strict Schema Mode (Recommended for System Tables)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importOptions.upsertOnConflict} onChange={e => setImportOptions({...importOptions, upsertOnConflict: e.target.checked})} />
                  <span className="text-sm text-zinc-300">Upsert on Conflict (Update existing records)</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-800/50">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded text-sm font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!pendingImportJson) return alert("Please paste JSON or upload a file.");
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  importTableFromJsonMutation.mutate({ 
                    tableName: activeTable || 'new_table', 
                    jsonString: pendingImportJson, 
                    options: importOptions 
                  });
                }}
                disabled={!pendingImportJson || importTableFromJsonMutation.isLoading}
                className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importTableFromJsonMutation.isLoading ? 'Importing...' : 'Run Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DbBrowserPage;
