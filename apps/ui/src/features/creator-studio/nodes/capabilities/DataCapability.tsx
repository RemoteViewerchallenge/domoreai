import React, { useState } from 'react';
import { Play, ChevronDown } from 'lucide-react';
import MonacoEditor from '../../../../components/MonacoEditor.js'; // Essential piece

export const DataCapability = () => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('SELECT * FROM "RawData" LIMIT 5');

  // Mock Columns/Data (In real app, this comes from TRPC)
  const columns = ['id', 'provider', 'model_name', 'cost_per_1k', 'context_window', 'is_active'];
  const row1 = ['mod_01', 'openai', 'gpt-4-turbo', '$0.01', '128k', 'true'];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      
      {/* 1. Query Editor (Monaco) */}
      <div className="h-32 border-b border-zinc-800 relative group">
         <MonacoEditor 
            value={query}
            onChange={(val) => setQuery(val || '')}
            language="sql"
            options={{
               minimap: { enabled: false },
               lineNumbers: 'off'
            }}
         />
         <button className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all">
            <Play size={12} fill="currentColor" />
         </button>
      </div>

      {/* 2. Results Grid (Titanium) */}
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
         {/* Status Bar */}
         <div className="flex items-center justify-between px-2 py-1 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-500">
            <span>Result: 1,204 rows</span>
            <span>14ms</span>
         </div>

         {/* The Table */}
         <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-zinc-900 text-[9px] uppercase text-zinc-400 font-bold sticky top-0 z-10">
                  <tr>
                     {columns.map(c => (
                        <th key={c} className="px-3 py-2 border-b border-zinc-800 border-r border-zinc-800/50 whitespace-nowrap">{c}</th>
                     ))}
                  </tr>
               </thead>
               <tbody className="font-mono text-[10px] text-zinc-300">
                  {/* Row 1 (Always Visible) */}
                  <tr className="bg-zinc-900/20">
                     {row1.map((cell, i) => (
                        <td key={i} className="px-3 py-2 border-b border-zinc-800 border-r border-zinc-800/30 truncate max-w-[150px]">{cell}</td>
                     ))}
                  </tr>
                  {/* Expansion Placeholder */}
                  {!expanded && (
                     <tr>
                        <td colSpan={columns.length} className="px-3 py-8 text-center">
                           <button onClick={() => setExpanded(true)} className="text-xs text-zinc-500 hover:text-white flex items-center justify-center gap-1 mx-auto">
                              <ChevronDown size={12} /> Show remaining 1,203 rows
                           </button>
                        </td>
                     </tr>
                  )}
                  {/* Expanded Rows */}
                  {expanded && [1,2,3,4].map(i => (
                     <tr key={i} className="hover:bg-purple-500/5 transition-colors">
                        {row1.map((cell, idx) => (
                           <td key={idx} className="px-3 py-2 border-b border-zinc-800 border-r border-zinc-800/30 truncate">{cell}_{i}</td>
                        ))}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
