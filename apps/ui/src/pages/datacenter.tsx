import React from 'react';
import { DataNode } from '../components/DataNode.js';
import { Database } from 'lucide-react';

const DataCenterPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Page Header */}
      <div className="flex-none h-10 px-4 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-[var(--color-primary)]" size={16} />
          <span className="text-sm font-bold tracking-wider uppercase">Data Center</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-4">
         <DataNode />
      </div>
    </div>
  );
};

export default DataCenterPage;