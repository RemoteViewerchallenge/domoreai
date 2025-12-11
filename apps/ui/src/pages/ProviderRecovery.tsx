
import React from 'react';
import { ProviderList } from '../components/ProviderList.js';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ProviderRecovery: React.FC = () => {
  return (
    <div className="h-screen w-full bg-black text-zinc-300 flex flex-col p-8">
      <div className="mb-8">
        <Link to="/providers" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-zinc-300 mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Providers
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Provider Data Recovery</h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          Use this tool to restore your model data tables. Click the <span className="text-green-400 font-bold">Green Refresh Icon</span> next to a provider to re-ingest its data into a specific table (e.g., &quot;orouter&quot;, &quot;tgthr&quot;).
        </p>
      </div>

      <div className="max-w-4xl border border-zinc-800 rounded-lg bg-zinc-900/50 p-6">
        <ProviderList 
          onIngest={() => {}} // No-op for this view
          onSelect={() => {}} 
        />
      </div>
    </div>
  );
};

export default ProviderRecovery;
