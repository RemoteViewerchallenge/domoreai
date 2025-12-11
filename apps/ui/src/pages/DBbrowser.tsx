import React from 'react';
import { DataNode } from '../features/data-workbench/DataNode.js';
import { Link } from 'react-router-dom';
import { Database, ArrowRight } from 'lucide-react';

const DataWorkbenchPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Page Header */}
      <div className="flex-none h-10 px-4 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-[var(--color-primary)]" size={16} />
          <span className="text-sm font-bold tracking-wider uppercase">Data</span>
        </div>
        <Link 
          to="/data-lake"
          className="flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-[var(--color-background)] rounded transition-all text-xs font-bold uppercase shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.6)]"
        >
          Data Lake <ArrowRight size={14} />
        </Link>
      </div>
      
      <div className="flex-1 overflow-hidden p-4">
         <DataNode />
      </div>
    </div>
  );
};

export default DataWorkbenchPage;