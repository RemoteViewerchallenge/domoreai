import React from 'react';
import { DataNode } from '../components/DataNode.js';
import { Link } from 'react-router-dom';
import { Database, ArrowRight } from 'lucide-react';

const UnifiedProviderPage: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base-300 text-base-content">

      {/* Navigation Header */}
      <div className="flex-none h-12 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-cyan-500" size={16} />
          <span className="text-lg font-bold tracking-wider text-zinc-200">DATA ENGINEERING NODE</span>
        </div>
        <Link 
          to="/data-lake"
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-700 rounded transition-all text-xs"
        >
          Go to Data Lake <ArrowRight size={14} />
        </Link>
      </div>
      
      <div className="flex-1 overflow-hidden p-4">
         <DataNode />
      </div>
    </div>
  );
};

export default UnifiedProviderPage;
