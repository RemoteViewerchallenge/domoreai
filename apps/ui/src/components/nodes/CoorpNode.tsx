import React from 'react';
import { Handle, Position } from 'reactflow';

interface CoorpNodeProps {
  data: {
    label: string;
  };
}

const CoorpNode: React.FC<CoorpNodeProps> = ({ data }) => {
  return (
    <div className="relative p-3 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl font-mono text-sm text-[var(--color-text)] min-w-[120px] text-center">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 -top-1.5 bg-[var(--color-primary)] border-2 border-[var(--color-border)] rounded-full"
      />
      <div className="px-2 py-1">{data.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 -bottom-1.5 bg-[var(--color-primary)] border-2 border-[var(--color-border)] rounded-full"
      />
    </div>
  );
};

export default CoorpNode;
