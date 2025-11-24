import React, { useState, useEffect, useRef } from 'react';

interface GridProps {
  data: Record<string, unknown>[];
  onEdit?: (rowId: string, colId: string, newVal: string | number | boolean | null) => void;
}

const EditableCell: React.FC<{
  value: unknown;
  rowId: string;
  colId: string;
  isEditable: boolean;
  onSave: (val: string) => void;
}> = ({ value, isEditable, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(String(value ?? ''));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue !== String(value ?? '')) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTempValue(String(value ?? ''));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="w-full bg-zinc-800 text-zinc-100 px-1 py-0.5 outline-none border border-blue-500 rounded"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      className={`truncate px-1 py-0.5 cursor-pointer hover:bg-zinc-800/50 rounded ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDoubleClick={() => isEditable && setIsEditing(true)}
      title={String(value)}
    >
      {String(value ?? '')}
    </div>
  );
};

export const UniversalDataGrid: React.FC<GridProps> = ({ data, onEdit }) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
  const columnsKey = columns.join(',');

  // Initialize column widths
  useEffect(() => {
    if (columns.length === 0) return;
    const initialWidths: Record<string, number> = {};
    columns.forEach(col => {
      if (!columnWidths[col]) {
        initialWidths[col] = 150; // Default width
      }
    });
    if (Object.keys(initialWidths).length > 0) {
      setColumnWidths(prev => ({ ...prev, ...initialWidths }));
    }
  }, [columnsKey]);

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || 150
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-[#09090b]">
      <table className="w-full text-left border-collapse text-xs font-mono">
        <thead className="sticky top-0 bg-zinc-900 z-10 shadow-sm">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="relative p-2 border-b border-zinc-800 text-zinc-400 font-medium uppercase tracking-wider whitespace-nowrap"
                style={{ width: columnWidths[col] || 150 }}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{col}</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, col)}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {data.map((row, rowIndex) => {
            const rowId = String(row.id || rowIndex);
            return (
              <tr key={rowId} className="hover:bg-zinc-900/50 transition-colors group">
                {columns.map((col) => {
                  const isEditable = col !== 'id' && col !== 'createdAt' && col !== 'updatedAt';
                  return (
                    <td 
                      key={`${rowId}-${col}`} 
                      className="p-1 border-r border-zinc-800/30 last:border-r-0"
                      style={{ width: columnWidths[col] || 150 }}
                    >
                      <EditableCell
                        value={row[col]}
                        rowId={rowId}
                        colId={col}
                        isEditable={isEditable}
                        onSave={(newVal) => {
                          if (onEdit) onEdit(rowId, col, newVal);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
