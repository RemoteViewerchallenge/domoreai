import React from 'react';
import { trpc } from '../utils/trpc.js';
import { Trash2, Database } from 'lucide-react';

interface ProviderListProps {
  onIngest: (providerId: string) => void;
  onSelect?: (providerId: string) => void;
}

const ProviderStats = ({ providerId }: { providerId: string }) => {
  const { data: stats } = trpc.usage.getProviderStats.useQuery(
    { providerId }, 
    { refetchInterval: 5000 }
  );

  if (!stats || !stats.rpm.max) return null;

  // Assuming 'current' is 'remaining' as stored in UsageCollector
  const rpmUsage = stats.rpm.max - stats.rpm.current;
  // If tpm.max is 0, we can't calculate usage properly, so maybe just show current (remaining) or hide
  const tpmUsage = stats.tpm.max ? (stats.tpm.max - stats.tpm.current) : 0;

  const isHealthy = stats.rpm.current > 0;

  return (
    <div className="group relative mx-2">
       {/* Pulse Indicator */}
       <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
       
       {/* Popover */}
       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black border border-slate-700 p-2 rounded shadow-xl z-50 text-[10px] font-mono pointer-events-none">
         <div className="font-bold text-slate-400 mb-1">Live Stats</div>
         <div className="flex justify-between">
           <span>RPM:</span>
           <span className={stats.rpm.current < 10 ? 'text-red-500' : 'text-green-400'}>
             {rpmUsage} / {stats.rpm.max}
           </span>
         </div>
         {stats.tpm.max > 0 && (
           <div className="flex justify-between">
             <span>TPM:</span>
             <span className={stats.tpm.current < 1000 ? 'text-red-500' : 'text-green-400'}>
               {tpmUsage} / {stats.tpm.max}
             </span>
           </div>
         )}
         {stats.credits !== null && (
            <div className="flex justify-between border-t border-slate-800 mt-1 pt-1">
              <span>Credits:</span>
              <span className="text-amber-400">${stats.credits.toFixed(2)}</span>
            </div>
         )}
       </div>
    </div>
  );
};

export const ProviderList: React.FC<ProviderListProps> = ({ onIngest, onSelect }) => {
  const { data: providers, isLoading, refetch } = trpc.providers.list.useQuery();
  const deleteProviderMutation = trpc.providers.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) return <div className="text-xs text-gray-500">Loading...</div>;

  return (
    <div className="space-y-1">
      {providers?.map((provider) => (
        <div 
          key={provider.id} 
          onClick={() => onSelect?.(provider.id)}
          className="card bg-base-200 p-2 rounded-md flex flex-row items-center justify-between group cursor-pointer hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="tooltip" data-tip={provider.type}>
              <div className={`w-2 h-2 rounded-full ${provider.apiKey ? 'bg-success' : 'bg-warning'}`}></div>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate">{provider.label}</span>
              <span className="text-[10px] text-gray-500 truncate">{provider.baseURL}</span>
            </div>
            
            {/* Live Stats Badge */}
            <ProviderStats providerId={provider.id} />
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="btn btn-ghost btn-xs btn-square text-blue-400"
              title="Ingest Raw Data"
              onClick={(e) => { e.stopPropagation(); onIngest(provider.id); }}
            >
              <Database size={12} />
            </button>
            <button 
              className="btn btn-ghost btn-xs btn-square text-error"
              title="Delete Provider"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this provider?')) {
                  deleteProviderMutation.mutate({ id: provider.id });
                }
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      
      {providers?.length === 0 && (
        <div className="text-xs text-gray-500 text-center py-4">
          No providers yet.
        </div>
      )}
    </div>
  );
};
