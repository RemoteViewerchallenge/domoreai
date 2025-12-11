import { trpc } from '../../utils/trpc.js';
import { Database, RefreshCw, Activity } from 'lucide-react';
import { UniversalDataGrid } from '../../../components/data/UniversalDataGrid.js';

const ModelsPage = () => {
  // Fetch the unified list (which now returns flattened "specs")
  const { data: models, isLoading, refetch } = trpc.model.getUnifiedModelList.useQuery();
  
  // Connection to the Model Doctor
  const healMutation = trpc.dataRefinement.healData.useMutation({
    onSuccess: (data) => {
        alert(data.message);
        refetch();
    }
  });

  // Human-readable labels for the grid
  const map = {
    id: 'Model ID',
    name: 'Name',
    provider: 'Source',
    contextWindow: 'Context',
    parameters: 'Params',
    costPer1k: 'Cost ($)'
  };

  if (isLoading) return <div className="p-10">Loading Corporate Assets...</div>;

  return (
    <div className="flex flex-col h-full bg-black text-gray-100">
      <div className="flex-none p-6 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-slate-100">Unified Model Registry</h1>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => healMutation.mutate()} 
                className="btn btn-sm btn-outline btn-accent gap-2"
                disabled={healMutation.isLoading}
            >
                <Activity size={14} /> 
                {healMutation.isLoading ? "Agents Working..." : "Run Diagnostics"}
            </button>
            <button onClick={() => refetch()} className="btn btn-sm btn-ghost gap-2">
                <RefreshCw size={14} /> Refresh
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full border border-zinc-800 rounded-lg bg-[#09090b]">
          {/* This Grid naturally adapts to new columns our Agents discover */}
          <UniversalDataGrid data={models || []} columnMapping={map} />
        </div>
      </div>
    </div>
  );
};

export default ModelsPage;
