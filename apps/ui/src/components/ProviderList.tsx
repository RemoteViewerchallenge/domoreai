import React from 'react';
import { trpc } from '../utils/trpc.js';
import { Trash2, Database } from 'lucide-react';

interface ProviderListProps {
  onIngest: (providerId: string) => void;
  onSelect?: (providerId: string) => void;
}

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
            <div className="tooltip" data-tip={provider.providerType}>
               <div className={`w-2 h-2 rounded-full ${provider.encryptedApiKey ? 'bg-success' : 'bg-warning'}`}></div>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate">{provider.name}</span>
              <span className="text-[10px] text-gray-500 truncate">{provider.baseURL}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="btn btn-ghost btn-xs btn-square text-blue-400"
              title="Ingest Raw Data"
              onClick={() => onIngest(provider.id)}
            >
              <Database size={12} />
            </button>
            <button 
              className="btn btn-ghost btn-xs btn-square text-error"
              title="Delete Provider"
              onClick={() => {
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
