import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Table, Eye, EyeOff, MoreVertical } from 'lucide-react';

interface TableNodeData {
  label: string;
  schema: { column_name: string, data_type: string }[];
  data?: Record<string, unknown>[]; // Preview data
}

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeData>) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={`
      min-w-[240px] rounded-lg overflow-hidden border-2 transition-all bg-zinc-950
      ${selected ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'border-zinc-800'}
    `}>
      {/* Header */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 handles-header">
        <div className="flex items-center gap-2 text-zinc-200">
          <Table size={14} className="text-emerald-500" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider">{data.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
             onClick={() => setShowPreview(!showPreview)}
             className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            <MoreVertical size={12} />
          </button>
        </div>
      </div>

      {/* Columns / Fields */}
      <div className="py-2 bg-zinc-950/50">
        {data.schema && data.schema.map((col) => (
          <div key={col.column_name} className="relative group px-3 py-1.5 flex items-center justify-between hover:bg-zinc-900/50">
            {/* Left Handle (Source/Target In) */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.column_name}-target`}
              className="!w-2 !h-2 !bg-zinc-700 !border-zinc-950 group-hover:!bg-indigo-500 transition-colors"
              style={{ left: -5 }}
            />

            <div className="flex items-center gap-2 overflow-hidden">
                {/* Icon based on type? */}
                <span className="text-[10px] font-mono text-zinc-500">{col.data_type}</span>
                <span className="text-xs text-zinc-300 font-medium truncate">{col.column_name}</span>
            </div>

            {/* Right Handle (Source Out) */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.column_name}-source`}
              className="!w-2 !h-2 !bg-zinc-700 !border-zinc-950 group-hover:!bg-indigo-500 transition-colors"
              style={{ right: -5 }}
            />
          </div>
        ))}
        {(!data.schema || data.schema.length === 0) && (
            <div className="px-3 py-2 text-[10px] text-zinc-600 italic">No columns defined</div>
        )}
      </div>

      {/* Data Preview */}
      {showPreview && (
        <div className="border-t border-zinc-800 bg-black/50 p-0 overflow-hidden">
            <div className="text-[9px] font-bold text-zinc-500 bg-zinc-900/50 px-2 py-1 uppercase tracking-wider">Preview</div>
            <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-left">
                    <thead>
                        <tr className="border-b border-zinc-800/50 text-zinc-500">
                            {data.schema.slice(0, 3).map(c => <th key={c.column_name} className="px-2 py-1 font-normal">{c.column_name}</th>)}
                        </tr>
                    </thead>
                    <tbody className="text-zinc-400">
                        {data.data?.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-900/30">
                                {data.schema.slice(0, 3).map(c => <td key={c.column_name} className="px-2 py-1 truncate max-w-[80px]">{String(row[c.column_name])}</td>)}
                            </tr>
                        )) || (
                            <tr><td className="px-2 py-2 text-zinc-600 italic" colSpan={3}>No data loaded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
});

TableNode.displayName = 'TableNode';
