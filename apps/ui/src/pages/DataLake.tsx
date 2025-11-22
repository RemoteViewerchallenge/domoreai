import React from 'react';
import DatabaseSpreadsheet from '../components/DatabaseSpreadsheet.js';

const DataLake: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-black text-gray-100 font-mono text-xs">
      <div className="flex-none px-4 py-2 border-b border-cyan-500/50 flex items-center justify-between bg-gray-950">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold uppercase tracking-wider">Data Lake Explorer</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Raw Data Analysis</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-1">
        <DatabaseSpreadsheet />
      </div>
    </div>
  );
};

export default DataLake;
