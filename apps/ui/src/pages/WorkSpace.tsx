import React, { useState } from 'react';
import WorkOrderColumn from '../components/work-order/WorkOrderColumn.js';
import { Monitor, Columns, Settings } from 'lucide-react';

const WorkSpace: React.FC = () => {
  const [columnCount, setColumnCount] = useState(3);
  
  // Create stable IDs for columns
  const columns = Array.from({ length: columnCount }, (_, i) => `col-${i}`);

  return (
    // fixed inset-0 locks this to the viewport. NO global scrolling allowed.
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden font-mono text-xs text-gray-300">
      
      {/* Header */}
      <div className="flex-none h-10 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 select-none z-50">
        <div className="flex items-center gap-3">
          <Monitor className="text-cyan-500" size={16} />
          <span className="font-bold text-cyan-400 tracking-widest">C.O.R.E. WORKSPACE</span>
        </div>

        <div className="flex items-center gap-6">
          {/* The Slider Control */}
          <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            <Columns size={12} className="text-zinc-500" />
            <span className="text-[10px] font-bold uppercase text-zinc-400 w-12">Cols: {columnCount}</span>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={columnCount}
              onChange={(e) => setColumnCount(Number(e.target.value))}
              className="w-24 h-1 bg-zinc-700 appearance-none cursor-pointer rounded-full accent-cyan-500"
            />
          </div>
          <Settings size={14} className="text-zinc-600 hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* Main Layout - Flex Row */}
      {/* min-w-0 is CRITICAL here to stop flex children from forcing scroll */}
      <div className="flex-1 flex flex-row min-w-0 min-h-0 bg-black">
        {columns.map((colId, index) => (
          <div key={colId} className="flex-1 min-w-0 h-full relative border-r border-zinc-800 last:border-r-0">
             <WorkOrderColumn columnId={colId} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkSpace;
