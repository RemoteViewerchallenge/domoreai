import React, { useState } from 'react';
import { Play, Save, Database, Trash2, RefreshCw, LayoutTemplate } from 'lucide-react';

interface VisualQueryBuilderProps {
  tables: string[];
  activeTable: string;
  onExecute: (sql: string) => void;
  onSaveTable: (sql: string, name: string) => void;
  onDeleteTable?: (name: string) => void; // New prop
}

export const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({
  tables,
  activeTable,
  onExecute,
  onSaveTable,
  onDeleteTable
}) => {
  // Default to the "Unpack" query if it's the RawDataLake
  const defaultSql = activeTable === 'RawDataLake' 
    ? `SELECT 
  elem->>'id' AS model_id, 
  elem->>'owned_by' AS owner, 
  'groq' AS provider_id 
FROM "RawDataLake", 
     jsonb_array_elements("rawData") AS elem 
LIMIT 50`
    : `SELECT * FROM "${activeTable}" LIMIT 100`;

  const [sql, setSql] = useState(defaultSql);
  const [newTableName, setNewTableName] = useState(`refined_${activeTable.toLowerCase()}`);
  const [showSave, setShowSave] = useState(false);

  const handleExecute = () => {
    // 1. Sanitize: Remove accidental "SQL" prefixes or common paste errors
    let cleanSql = sql.trim();
    if (cleanSql.toUpperCase().startsWith('SQL')) {
      cleanSql = cleanSql.substring(3).trim();
    }
    onExecute(cleanSql);
  };

  const handleSave = () => {
    let cleanSql = sql.trim();
    if (cleanSql.toUpperCase().startsWith('SQL')) {
      cleanSql = cleanSql.substring(3).trim();
    }
    onSaveTable(cleanSql, newTableName);
    setShowSave(false);
  };

  return (
    <div className="flex flex-col h-[400px] bg-zinc-900 border-b border-zinc-800 shadow-2xl">
      
      {/* 1. Toolbar */}
      <div className="flex-none h-12 px-4 flex items-center justify-between bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
             <Database size={16} className="text-purple-400" />
             <span className="font-mono text-sm text-zinc-200">{activeTable}</span>
          </div>
          <span className="text-zinc-700">|</span>
          <button 
             onClick={() => setSql(`SELECT * FROM "${activeTable}" LIMIT 10`)}
             className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <RefreshCw size={10} /> Reset Query
          </button>
        </div>

        <div className="flex items-center gap-2">
           {onDeleteTable && activeTable !== 'RawDataLake' && (
             <button 
               onClick={() => {
                 if(confirm(`Delete table "${activeTable}" permanently?`)) onDeleteTable(activeTable);
               }}
               className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900 rounded transition-all text-xs mr-4"
             >
               <Trash2 size={14} /> DELETE TABLE
             </button>
           )}

           <button 
             onClick={handleExecute}
             className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded transition-all text-xs font-bold"
           >
             <Play size={14} className="text-green-400" /> RUN PREVIEW
           </button>

           <div className="h-6 w-px bg-zinc-800 mx-1"></div>

           <div className="flex items-center gap-0 bg-cyan-900/20 border border-cyan-800/50 rounded overflow-hidden">
              {!showSave ? (
                <button 
                  onClick={() => setShowSave(true)}
                  className="px-4 py-1.5 text-cyan-400 hover:bg-cyan-900/30 text-xs font-bold flex items-center gap-2"
                >
                  <Save size={14} /> SAVE AS TABLE...
                </button>
              ) : (
                <div className="flex items-center animate-in slide-in-from-right-2">
                  <input 
                    type="text" 
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="bg-black text-cyan-200 text-xs px-2 py-1.5 outline-none w-40 placeholder-cyan-800/50"
                    placeholder="table_name"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                  >
                    CREATE
                  </button>
                  <button 
                    onClick={() => setShowSave(false)}
                    className="px-2 py-1.5 hover:bg-zinc-800 text-zinc-500"
                  >
                    X
                  </button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 2. Main Workspace (Editor + Sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Schema/Columns Helper */}
        <div className="w-48 bg-black/50 border-r border-zinc-800 p-3 overflow-y-auto">
           <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Available Tables</h4>
           <div className="flex flex-col gap-1">
              {tables.map(t => (
                <button 
                  key={t} 
                  onClick={() => setSql(prev => `${prev}\n-- Joined\nLEFT JOIN "${t}" ON ...`)}
                  className={`text-left text-xs truncate px-2 py-1 rounded ${t === activeTable ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative bg-[#0d1117]">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="w-full h-full bg-transparent text-zinc-300 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-700 leading-relaxed"
            spellCheck={false}
          />
          <div className="absolute bottom-2 right-4 text-zinc-600 text-[10px]">
             CMD+ENTER to Run
          </div>
        </div>

      </div>
    </div>
  );
};
