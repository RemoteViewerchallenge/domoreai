import React, { useState, useEffect } from 'react';
import { Play, Plus, X, Database, Code, Save, Info } from 'lucide-react';

export interface QueryBuilderProps {
  tables: string[];
  onExecute: (sql: string) => void;
  onSaveTable?: (sql: string, tableName: string) => void;
  isLoading?: boolean;
}

interface Filter {
  id: string;
  column: string;
  operator: string;
  value: string;
}

export const VisualQueryBuilder: React.FC<QueryBuilderProps> = ({ 
  tables, 
  onExecute, 
  onSaveTable, 
  isLoading 
}) => {
  // State
  const [selectedTable, setSelectedTable] = useState(tables[0] || 'RawDataLake');
  const [limit] = useState(100);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');

  // 1. AUTO-DETECT MODE
  const isRawLake = selectedTable === 'RawDataLake';

  // 2. RESET ON TABLE CHANGE
  useEffect(() => {
    setFilters([]); 
    setGeneratedSQL(`SELECT * FROM "${selectedTable}" LIMIT ${limit}`);
  }, [selectedTable, limit]);

  // 3. SQL GENERATOR ENGINE
  useEffect(() => {
    if (rawMode) return;

    let sql = `SELECT * FROM "${selectedTable}"`;

    if (filters.length > 0) {
      const whereClauses = filters.map(f => {
        // --- MODE SWITCHING LOGIC ---
        if (isRawLake) {
            // JSON MODE: Automatically wrap input "pricing.prompt" -> rawData->'pricing'->>'prompt'
            const parts = f.column.split('.');
            let colRef = '';
            
            if (parts.length === 1) {
                colRef = `rawData->>'${parts[0]}'`;
            } else {
                const path = parts.slice(0, -1).map(p => `'${p}'`).join('->');
                const last = parts[parts.length - 1];
                colRef = `rawData->${path}->>'${last}'`;
            }
            
            // Handle Numeric comparisons for JSON strings
            if (['>', '<', '>=', '<='].includes(f.operator)) {
                colRef = `(${colRef})::numeric`;
            }

            const val = !isNaN(Number(f.value)) && f.value !== '' ? f.value : `'${f.value}'`;
            return `${colRef} ${f.operator} ${val}`;
        } 
        else {
            // STANDARD MODE: Just use the column name
            const val = !isNaN(Number(f.value)) && f.value !== '' ? f.value : `'${f.value}'`;
            return `"${f.column}" ${f.operator} ${val}`;
        }
      });
      
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ` LIMIT ${limit}`;
    setGeneratedSQL(sql);
  }, [selectedTable, filters, limit, rawMode, isRawLake]);

  // --- ACTIONS ---
  const addFilter = () => {
    setFilters([...filters, { 
      id: Math.random().toString(36).substr(2, 9), 
      column: '', 
      operator: 'ILIKE', 
      value: '' 
    }]);
  };

  const updateFilter = (id: string, field: keyof Filter, val: any) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(x => x.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-zinc-900 border-b border-zinc-800 text-xs font-mono">
      
      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black rounded border border-zinc-800 px-2 py-1">
            <Database size={12} className="text-purple-500 mr-2" />
            <span className="text-zinc-500 font-bold mr-2">FROM</span>
            <select 
              className="bg-transparent text-zinc-300 outline-none appearance-none cursor-pointer"
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
            >
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* MODE INDICATOR */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold ${isRawLake ? 'bg-yellow-900/20 text-yellow-500' : 'bg-blue-900/20 text-blue-400'}`}>
             <Info size={12} />
             {isRawLake ? 'JSON MODE (Use dot notation)' : 'SQL MODE (Use column names)'}
          </div>
        </div>

        <button 
          onClick={() => setRawMode(!rawMode)}
          className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${
            rawMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Code size={12} /> {rawMode ? 'Raw SQL' : 'Visual Builder'}
        </button>
      </div>

      {/* FILTER BUILDER */}
      {!rawMode && (
        <div className="space-y-2 pl-1">
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-2 animate-in slide-in-from-left-2">
              <div className="w-4 border-l-2 border-zinc-800 h-full absolute left-2" />
              <span className="text-cyan-600 font-bold w-10 text-right">WHERE</span>
              
              {/* Column Name Input */}
              <input 
                className="bg-zinc-950 border border-zinc-800 text-yellow-500 rounded px-2 py-1 w-48 focus:border-yellow-700 outline-none"
                placeholder={isRawLake ? 'pricing.prompt' : 'column_name'}
                value={f.column}
                onChange={e => updateFilter(f.id, 'column', e.target.value)}
              />

              {/* Operator */}
              <select 
                className="bg-zinc-950 border border-zinc-800 text-purple-400 rounded px-2 py-1 text-center"
                value={f.operator}
                onChange={e => updateFilter(f.id, 'operator', e.target.value)}
              >
                <option value="ILIKE">contains</option>
                <option value="=">=</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
              </select>

              {/* Value */}
              <input 
                className="bg-zinc-950 border border-zinc-800 text-green-400 rounded px-2 py-1 flex-1 focus:border-green-700 outline-none"
                placeholder="value..."
                value={f.value}
                onChange={e => updateFilter(f.id, 'value', e.target.value)}
              />

              <button onClick={() => removeFilter(f.id)} className="text-zinc-600 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          ))}

          <button onClick={addFilter} className="flex items-center gap-1 text-zinc-500 hover:text-cyan-400 mt-1 ml-12">
            <Plus size={12} /> Add Filter
          </button>
        </div>
      )}

      {/* EXECUTE & SAVE */}
      <div className="flex items-stretch gap-0 border border-zinc-800 rounded overflow-hidden mt-2">
         <div className="flex-1 bg-black p-3 relative">
            <textarea 
              className="w-full h-full bg-transparent text-blue-300 resize-none outline-none font-mono text-sm"
              rows={2}
              value={generatedSQL}
              onChange={e => { setRawMode(true); setGeneratedSQL(e.target.value); }}
            />
         </div>

         <div className="flex flex-col border-l border-zinc-800 bg-zinc-900">
            <button 
              onClick={() => onExecute(generatedSQL)}
              disabled={isLoading}
              className="flex-1 px-4 flex items-center gap-2 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <Play size={14} className={isLoading ? "animate-spin" : ""} />
              <span>RUN</span>
            </button>
            
            {onSaveTable && (
              <button 
                onClick={() => {
                  const name = prompt("Create Table Name? (e.g. 'openai_cheap_models')");
                  if (name) onSaveTable(generatedSQL, name);
                }}
                className="h-8 px-4 flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 border-t border-zinc-800"
                title="Save these results as a reusable table"
              >
                <Save size={12} />
              </button>
            )}
         </div>
      </div>
    </div>
  );
};
