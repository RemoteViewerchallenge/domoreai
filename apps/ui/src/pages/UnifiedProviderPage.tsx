import React from 'react';
import { DataNode } from '../components/DataNode.js';
import { Link } from 'react-router-dom';
import { Database, ArrowRight } from 'lucide-react';

const UnifiedProviderPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-black text-zinc-200">
      {/* Page Header */}
      <div className="flex-none h-10 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-cyan-500" size={16} />
          <span className="text-sm font-bold tracking-wider uppercase">Providers</span>
        </div>
        <Link 
          to="/data-lake"
          className="flex items-center gap-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-all text-xs font-bold uppercase shadow-[0_0_15px_rgba(6,182,212,0.6)]"
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

export default UnifiedProviderPage;
