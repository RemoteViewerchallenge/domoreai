import { trpc } from '../../utils/trpc.js';
import { Database } from 'lucide-react';

const ModelsPage = () => {
  // Use the new unified list procedure
  const { data: models, isLoading, isError, error } = trpc.model.getUnifiedModelList.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error m-4">
        <span>Error: {error instanceof Error ? error.message : 'Unknown error'}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-slate-100">Unified Model Registry</h1>
      </div>

      <div className="overflow-x-auto bg-base-200 rounded-lg border border-slate-700">
        <table className="table table-zebra w-full table-sm">
          <thead>
            <tr className="bg-base-300 text-slate-300">
              <th>Name</th>
              <th>Model ID</th>
              <th>Context Length</th>
              <th>Source Table</th>
            </tr>
          </thead>
          <tbody>
            {models?.map((model, index) => (
              <tr key={`${model.source}-${model.id}-${index}`} className="hover:bg-base-300/50">
                <td className="font-medium text-slate-200">{model.name}</td>
                <td className="font-mono text-xs text-[var(--color-text-secondary)]">{model.id}</td>
                <td className="text-[var(--color-text-secondary)]">
                  {model.contextLength > 0 ? model.contextLength.toLocaleString() : '-'}
                </td>
                <td>
                  <span className="badge badge-sm badge-outline border-slate-600 text-[var(--color-text-secondary)]">
                    {model.source}
                  </span>
                </td>
              </tr>
            ))}
            {models?.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[var(--color-text-secondary)]">
                  No models found in registered tables.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-[var(--color-text-secondary)] px-1">
        Showing {models?.length || 0} models from all dynamic sources.
      </div>
    </div>
  );
};

export default ModelsPage;
