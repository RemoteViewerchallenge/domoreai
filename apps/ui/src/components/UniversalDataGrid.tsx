import React, { useState, useEffect, useMemo } from 'react';
import { Edit2 } from 'lucide-react';

interface GridProps {
  data: Record<string, unknown>[];
  // Allow parent to control column mapping
  columnMapping?: Record<string, string>; 
  onColumnMapChange?: (original: string, mapped: string) => void;
  headers?: string[]; // For empty tables, show schema headers
}

export const UniversalDataGrid: React.FC<GridProps> = ({ 
  data, 
  columnMapping = {}, 
  onColumnMapChange,
  headers = []
}) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  
  // Header Editing State
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [tempHeaderVal, setTempHeaderVal] = useState('');

  const columns = useMemo(() => {
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    } else if (headers && headers.length > 0) {
      return headers;
    }
    return [];
  }, [data, headers]);

  // Initialize Widths
  useEffect(() => {
    if (columns.length === 0) return;
    setColumnWidths(prev => {
        const next = { ...prev };
        let changed = false;
        columns.forEach(col => {
           if (!next[col]) { next[col] = 150; changed = true; }
        });
        return changed ? next : prev;
    });
  }, [columns]);

  // Resize Handlers
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ column, startX: e.clientX, startWidth: columnWidths[column] || 150 });
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      setColumnWidths(prev => ({ ...prev, [resizing.column]: Math.max(50, resizing.startWidth + diff) }));
    };
    const handleMouseUp = () => setResizing(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  if (!data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] bg-zinc-900/20 border border-zinc-800/50 rounded-lg m-2">
        <span className="text-xs font-mono">NO DATA FOUND</span>
    </div>
  );

  return (
    <div className="h-full w-full overflow-auto bg-[var(--color-background-secondary)] scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent text-[var(--color-text)]">
      <table className="w-full text-left border-collapse text-xs font-mono table-fixed">
        <thead className="sticky top-0 bg-[var(--color-background)] z-20 shadow-md ring-1 ring-[var(--color-border)] text-[var(--color-text-secondary)]">
          <tr>
            {columns.map((col) => {
              const mappedName = columnMapping[col] || col;
              const isMapped = columnMapping[col] && columnMapping[col] !== col;
              const isEditing = editingHeader === col;

              return (
                <th key={col} className="relative p-0 border-b border-zinc-800 group" style={{ width: columnWidths[col] || 150 }}>
                  <div className={`flex items-center justify-between px-2 py-2 h-full ${isMapped ? 'bg-indigo-900/20 text-indigo-300' : 'text-[var(--color-text-secondary)]'}`}>
                    
                    {/* Header Content */}
                    {isEditing ? (
                        <div className="flex items-center gap-1 w-full">
                            <input 
                                autoFocus
                                className="w-full bg-black border border-indigo-500 rounded px-1 py-0.5 outline-none text-white"
                                value={tempHeaderVal}
                                onChange={e => setTempHeaderVal(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter') {
                                        if(onColumnMapChange) onColumnMapChange(col, tempHeaderVal);
                                        setEditingHeader(null);
                                    }
                                }}
                                onBlur={() => setEditingHeader(null)}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 overflow-hidden w-full" onDoubleClick={() => { setEditingHeader(col); setTempHeaderVal(mappedName); }}>
                            <span className="truncate font-bold" title={`${col} -> ${mappedName}`}>
                                {mappedName}
                            </span>
                            {/* Edit Mapping Button */}
                            {onColumnMapChange && (
                                <button 
                                    onClick={() => { setEditingHeader(col); setTempHeaderVal(mappedName); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white transition-opacity"
                                >
                                    <Edit2 size={10} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Resize Handle */}
                    <div 
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-cyan-500/10 z-30 flex justify-center group-hover:bg-zinc-800/50" 
                        onMouseDown={(e) => handleMouseDown(e, col)}
                    >
                        <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
                    </div>
                  </div>
                  
                  {/* Mapping Indicator */}
                  {isMapped && !isEditing && (
                      <div className="absolute top-0 right-1 text-[8px] text-[var(--color-text-secondary)] font-normal opacity-50">
                          {col}
                      </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition-colors group hover:bg-[var(--color-background)]/30">
              {columns.map((col) => (
                <td key={`${rowIndex}-${col}`} className="p-1.5 border-r border-[var(--color-border)]/30 last:border-r-0 overflow-hidden text-[var(--color-text)] whitespace-nowrap" style={{ width: columnWidths[col] || 150 }}>
                  <span className="opacity-90 group-hover:opacity-100">
                    {(row[col] === null || row[col] === undefined) ? '' : (typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] as any))}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
