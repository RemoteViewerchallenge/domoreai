import React, { useState, useEffect } from 'react';
import { Play, Save, Database, Trash2, Plus, X, Settings, Code } from 'lucide-react';
import { trpc } from '../utils/trpc.js';

interface VisualQueryBuilderProps {
  activeTable: string;
  onExecute: (sql: string) => void;
  onSaveTable: (sql: string, name: string) => void;
  onDeleteTable?: (name: string) => void;
}

export const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({
  activeTable,
  onExecute,
  onSaveTable,
  onDeleteTable
}) => {
  // --- STATE ---
  const [mode, setMode] = useState<'query' | 'schema'>('query');
  const [sql, setSql] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [showSave, setShowSave] = useState(false);

  // Visual Query State
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ col: string; op: string; val: string }[]>([]);

  // Schema State
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('TEXT');

  // --- API ---
  const utils = trpc.useContext();
  
  // Get columns for the active table
  const { data: tableData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: activeTable, limit: 1 },
    { enabled: !!activeTable }
  );
  
  const columns = tableData?.rows?.[0] ? Object.keys(tableData.rows[0]) : [];

  // Schema Mutations
  const addColumnMutation = trpc.dataRefinement.addColumn.useMutation({
    onSuccess: () => {
      utils.dataRefinement.getTableData.invalidate();
      setNewColName('');
    }
  });

  const dropColumnMutation = trpc.dataRefinement.dropColumn.useMutation({
    onSuccess: () => utils.dataRefinement.getTableData.invalidate()
  });

  // --- EFFECTS ---
  useEffect(() => {
    // Reset when table changes
    setSql(`SELECT * FROM "${activeTable}" LIMIT 100`);
    setSelectedColumns([]);
    setFilters([]);
  }, [activeTable]);

  // Auto-generate SQL when visual controls change
  useEffect(() => {
    if (mode === 'query' && (selectedColumns.length > 0 || filters.length > 0)) {
      const cols = selectedColumns.length > 0 ? selectedColumns.map(c => `"${c}"`).join(', ') : '*';
      let query = `SELECT ${cols} FROM "${activeTable}"`;
      
      if (filters.length > 0) {
        const where = filters.map(f => `"${f.col}" ${f.op} '${f.val}'`).join(' AND ');
        query += ` WHERE ${where}`;
      }
      
      query += ` LIMIT 100`;
      setSql(query);
    }
  }, [selectedColumns, filters, activeTable, mode]);

  // --- HANDLERS ---
  const handleExecute = () => {
    let cleanSql = sql.trim();
    if (cleanSql.toUpperCase().startsWith('SQL')) cleanSql = cleanSql.substring(3).trim();
    onExecute(cleanSql);
  };

  const handleSave = () => {
    if (!newTableName) {
      alert("Please enter a table name");
      return;
    }
    onSaveTable(sql, newTableName);
    setShowSave(false);
    setNewTableName('');
  };

  return (
    <div className="flex flex-col h-[400px] bg-zinc-900 border-b border-zinc-800 shadow-2xl font-mono text-xs">
      
      {/* 1. HEADER / TABS */}
      <div className="flex-none h-10 px-4 flex items-center justify-between bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-zinc-200 font-bold">
             <Database size={14} className="text-purple-400" />
             {activeTable}
           </div>
           
           <div className="h-4 w-px bg-zinc-800" />

           <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
             <button 
               onClick={() => setMode('query')}
               className={`px-3 py-1 rounded flex items-center gap-2 ${mode === 'query' ? 'bg-zinc-800 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Code size={12} /> Query
             </button>
             <button 
               onClick={() => setMode('schema')}
               className={`px-3 py-1 rounded flex items-center gap-2 ${mode === 'schema' ? 'bg-zinc-800 text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Settings size={12} /> Schema
             </button>
           </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
           {onDeleteTable && activeTable !== 'RawDataLake' && (
             <button 
               onClick={() => { if(confirm(`Delete table "${activeTable}"?`)) onDeleteTable(activeTable); }}
               className="text-red-500 hover:text-red-400 hover:bg-red-900/20 px-2 py-1 rounded"
             >
               <Trash2 size={14} />
             </button>
           )}
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- MODE: QUERY --- */}
        {mode === 'query' && (
          <>
            {/* Visual Builder Sidebar */}
            <div className="w-64 bg-black/20 border-r border-zinc-800 p-4 overflow-y-auto">
               <div className="mb-6">
                 <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Columns</h4>
                 <div className="space-y-1">
                   {columns.map(col => (
                     <label key={col} className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:bg-zinc-800/50 p-1 rounded">
                       <input 
                         type="checkbox" 
                         checked={selectedColumns.includes(col)}
                         onChange={(e) => {
                           if (e.target.checked) setSelectedColumns([...selectedColumns, col]);
                           else setSelectedColumns(selectedColumns.filter(c => c !== col));
                         }}
                         className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                       />
                       {col}
                     </label>
                   ))}
                 </div>
               </div>

               <div>
                 <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Filters</h4>
                 {filters.map((f, i) => (
                   <div key={i} className="flex items-center gap-1 mb-2 bg-zinc-900 p-1 rounded border border-zinc-800">
                      <span className="text-cyan-300">{f.col}</span>
                      <span className="text-zinc-500">{f.op}</span>
                      <span className="text-zinc-300 truncate max-w-[50px]">{f.val}</span>
                      <button onClick={() => setFilters(filters.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-600 hover:text-red-400"><X size={12}/></button>
                   </div>
                 ))}
                 
                 {/* Simple Filter Adder */}
                 <div className="flex flex-col gap-2 mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-800 border-dashed">
                    <select id="filterCol" className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-zinc-300 outline-none">
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <select id="filterOp" className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-zinc-300 outline-none w-16">
                        <option value="=">=</option>
                        <option value="LIKE">LIKE</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                      </select>
                      <input id="filterVal" placeholder="Value" className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none w-full" />
                    </div>
                    <button 
                      onClick={() => {
                        const col = (document.getElementById('filterCol') as HTMLSelectElement).value;
                        const op = (document.getElementById('filterOp') as HTMLSelectElement).value;
                        const val = (document.getElementById('filterVal') as HTMLInputElement).value;
                        if (col && val) setFilters([...filters, { col, op, val }]);
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1 rounded text-center"
                    >
                      + Add Filter
                    </button>
                 </div>
               </div>
            </div>

            {/* SQL Editor & Actions */}
            <div className="flex-1 flex flex-col bg-[#0d1117]">
               <textarea
                 value={sql}
                 onChange={(e) => setSql(e.target.value)}
                 className="flex-1 bg-transparent text-zinc-300 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
                 spellCheck={false}
               />
               
               <div className="h-12 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                     {!showSave ? (
                       <button onClick={() => setShowSave(true)} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 font-bold">
                         <Save size={14} /> Save as Table
                       </button>
                     ) : (
                       <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                         <input 
                           value={newTableName} onChange={e => setNewTableName(e.target.value)}
                           placeholder="new_table_name"
                           className="bg-black border border-zinc-700 rounded px-2 py-1 text-zinc-200 outline-none w-40"
                         />
                         <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded font-bold">Save</button>
                         <button onClick={() => setShowSave(false)} className="text-zinc-500 hover:text-zinc-300"><X size={14}/></button>
                       </div>
                     )}
                  </div>

                  <button 
                    onClick={handleExecute}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-1.5 rounded font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
                  >
                    <Play size={14} /> RUN QUERY
                  </button>
               </div>
            </div>
          </>
        )}

        {/* --- MODE: SCHEMA --- */}
        {mode === 'schema' && (
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-950">
             <div className="max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-orange-400" />
                  Manage Schema: <span className="text-orange-200">{activeTable}</span>
                </h3>

                <div className="bg-zinc-900 rounded border border-zinc-800 overflow-hidden mb-8">
                   <table className="w-full text-left">
                     <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500">
                       <tr>
                         <th className="p-3">Column Name</th>
                         <th className="p-3">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800">
                       {columns.map(col => (
                         <tr key={col} className="group hover:bg-zinc-800/50">
                           <td className="p-3 text-zinc-300 font-mono">{col}</td>
                           <td className="p-3">
                             {col !== 'id' && col !== 'createdAt' && (
                               <button 
                                 onClick={() => { if(confirm(`Drop column "${col}"?`)) dropColumnMutation.mutate({ tableName: activeTable, columnName: col }) }}
                                 className="text-zinc-600 hover:text-red-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <Trash2 size={14} /> Drop
                               </button>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>

                <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800 border-dashed">
                   <h4 className="font-bold text-zinc-400 mb-3">Add New Column</h4>
                   <div className="flex gap-2">
                     <input 
                       value={newColName} onChange={e => setNewColName(e.target.value)}
                       placeholder="column_name"
                       className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 outline-none"
                     />
                     <select 
                       value={newColType} onChange={e => setNewColType(e.target.value)}
                       className="bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 outline-none w-32"
                     >
                       <option value="TEXT">Text</option>
                       <option value="INTEGER">Integer</option>
                       <option value="BOOLEAN">Boolean</option>
                       <option value="JSONB">JSON</option>
                     </select>
                     <button 
                       onClick={() => addColumnMutation.mutate({ tableName: activeTable, columnName: newColName, type: newColType })}
                       disabled={!newColName}
                       className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded font-bold flex items-center gap-2"
                     >
                       <Plus size={16} /> Add
                     </button>
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
