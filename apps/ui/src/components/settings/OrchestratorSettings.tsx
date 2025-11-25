import { trpc } from '../../utils/trpc';

export function OrchestratorSettings() {
  const utils = trpc.useContext();
  // 1. Get current config
  const { data: config } = trpc.orchestrator.getConfig.useQuery();
  // 2. Get list of available tables
  const { data: tables } = trpc.dataRefinement.listAllTables.useQuery();
  
  const updateConfig = trpc.orchestrator.updateConfig.useMutation({
    onSuccess: () => utils.orchestrator.getConfig.invalidate()
  });

  return (
    <div className="p-4 border rounded-lg bg-slate-900 border-slate-700">
      <h3 className="text-lg font-medium mb-4 text-white">Model Source Configuration</h3>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-400">
          Select the database table that defines your Model Catalog:
        </label>
        <select 
          className="bg-slate-800 border border-slate-700 rounded p-2 text-white"
          value={config?.activeTableName || ''}
          onChange={(e) => updateConfig.mutate({ activeTableName: e.target.value })}
        >
          {tables?.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          Only models from this table (joined with real-time telemetry) will be used by Agents.
        </p>
      </div>
    </div>
  );
}
