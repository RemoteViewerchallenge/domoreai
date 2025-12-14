import React from 'react';
import { AlertCircle, Play, Filter } from 'lucide-react';

export const DataCapability = ({ error }: { error?: string }) => {
  return (
    <div className="flex flex-col h-full w-full font-mono text-[10px]">
      
      {/* 1. Query Bar (Minimal) */}
      <div className="flex border-b border-zinc-800 h-8">
        <div className="flex-1 relative">
            <textarea 
                className="w-full h-full bg-zinc-950 text-zinc-300 p-1.5 focus:outline-none resize-none"
                placeholder="SELECT * FROM source..."
                spellCheck={false}
            />
        </div>
        <button className="w-8 border-l border-zinc-800 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] flex items-center justify-center text-zinc-500 transition-colors">
            <Play size={12} />
        </button>
      </div>

      {/* 2. Error Banner */}
      {error && (
        <div className="bg-red-900/20 border-b border-red-900/50 px-2 py-1 flex items-center gap-2 text-red-400">
          <AlertCircle size={10} />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 3. The Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-zinc-950">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-500 font-bold">
            <tr>
              <th className="px-2 py-1 border-b border-zinc-800 w-12">#</th>
              <th className="px-2 py-1 border-b border-zinc-800 w-32">ID</th>
              <th className="px-2 py-1 border-b border-zinc-800">DATA_PAYLOAD</th>
              <th className="px-2 py-1 border-b border-zinc-800 w-20 text-right">SCORE</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300 divide-y divide-zinc-800/50">
            {[1,2,3,4,5,6].map(i => (
              <tr key={i} className="hover:bg-[var(--color-primary)]/5 transition-colors group">
                <td className="px-2 py-0.5 text-zinc-600 border-r border-zinc-800/30">{i}</td>
                <td className="px-2 py-0.5 truncate text-zinc-500">uuid-{i}x9</td>
                <td className="px-2 py-0.5 truncate group-hover:text-white transition-colors">
                    {`{"event": "login", "ts": ${Date.now()}}`}
                </td>
                <td className="px-2 py-0.5 text-right text-[var(--color-success)]">0.9{i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 4. Footer */}
      <div className="h-5 border-t border-zinc-800 flex items-center justify-between px-2 bg-zinc-950 text-zinc-600">
        <div className="flex gap-2">
            <span>6 ROWS</span>
            <span className="text-zinc-700">|</span>
            <span>14ms</span>
        </div>
        <button className="hover:text-zinc-300 flex items-center gap-1">
            <Filter size={8} /> FILTER
        </button>
      </div>
    </div>
  );
};
