import React, { useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils.js';

interface Column {
  id: string;
  name: string;
  isVisible: boolean;
  isPrimaryKey: boolean;
}

interface ArbitrageNodeData {
  label: string;
  provider: { id: string; name: string };
  columns: Column[];
}

const ArbitrageNode: React.FC<NodeProps<ArbitrageNodeData>> = ({ data }) => {
  const [columns, setColumns] = useState<Column[]>(data.columns);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editedColumnName, setEditedColumnName] = useState<string>('');

  const handleToggleVisibility = useCallback((id: string) => {
    setColumns((prevCols) =>
      prevCols.map((col) =>
        col.id === id ? { ...col, isVisible: !col.isVisible } : col
      )
    );
  }, []);

  const handleTogglePrimaryKey = useCallback((id: string) => {
    setColumns((prevCols) =>
      prevCols.map((col) => ({
        ...col,
        isPrimaryKey: col.id === id ? !col.isPrimaryKey : false, // Only one primary key per node
      }))
    );
  }, []);

  const handleDoubleClickColumn = useCallback((id: string, currentName: string) => {
    setEditingColumnId(id);
    setEditedColumnName(currentName);
  }, []);

  const handleSaveColumnName = useCallback((id: string) => {
    setColumns((prevCols) =>
      prevCols.map((col) =>
        col.id === id ? { ...col, name: editedColumnName } : col
      )
    );
    setEditingColumnId(null);
    setEditedColumnName('');
  }, [editedColumnName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleSaveColumnName(id);
    }
    if (e.key === 'Escape') {
      setEditingColumnId(null);
      setEditedColumnName('');
    }
  }, [handleSaveColumnName]);

  return (
    <div
      className={cn(
        'bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden',
        'min-w-[200px] text-[10pt] font-mono'
      )}
      style={{ fontFamily: 'Fira Code, monospace' }}
    >
      <div
        className={cn(
          'px-3 py-2 border-b border-[var(--color-border)]',
          'bg-zinc-900 text-zinc-200 font-bold uppercase tracking-wide'
        )}
      >
        {data.label}
      </div>
      <div className="p-2">
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              'flex items-center gap-1 py-1 px-2 rounded-md transition-opacity',
              'hover:bg-zinc-800/50',
              col.isVisible ? 'opacity-100' : 'opacity-30'
            )}
          >
            {/* Target Handle (Left) */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.id}-target`}
              className="!w-2 !h-2 !bg-indigo-500 !border-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />

            {/* Column Name / Input */}
            <div
              className="flex-1 text-zinc-300 cursor-pointer"
              onDoubleClick={() => handleDoubleClickColumn(col.id, col.name)}
            >
              {editingColumnId === col.id ? (
                <input
                  type="text"
                  value={editedColumnName}
                  onChange={(e) => setEditedColumnName(e.target.value)}
                  onBlur={() => handleSaveColumnName(col.id)}
                  onKeyDown={(e) => handleKeyDown(e, col.id)}
                  className={cn(
                    'w-full bg-zinc-700 border border-cyan-500 rounded px-1',
                    'text-zinc-200 text-[10pt] font-mono focus:outline-none'
                  )}
                  autoFocus
                />
              ) : (
                <span className={cn(col.isPrimaryKey && 'text-cyan-400 font-bold')}>
                  {col.name}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTogglePrimaryKey(col.id)}
                className={cn(
                  'p-0.5 rounded-sm transition-colors',
                  col.isPrimaryKey ? 'text-cyan-400 hover:bg-cyan-500/20' : 'text-zinc-500 hover:text-zinc-300'
                )}
                title="Set as Primary Key"
              >
                <KeyRound size={12} />
              </button>
              <button
                onClick={() => handleToggleVisibility(col.id)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-sm transition-colors"
                title={col.isVisible ? 'Hide Column' : 'Show Column'}
              >
                {col.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>

            {/* Source Handle (Right) */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.id}-source`}
              className="!w-2 !h-2 !bg-cyan-500 !border-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArbitrageNode;