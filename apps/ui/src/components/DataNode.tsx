import React, { useState } from 'react';
import { Database, ArrowRight, Trash2, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js';

export const DataNode: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState('openrouterfree');
  const [providerId, setProviderId] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const utils = trpc.useContext();

  // Queries
  const { data: rawData, isLoading } = trpc.dataRefinement.previewTable.useQuery({ tableName: selectedTable });
  const { data: providers } = trpc.providers.list.useQuery();

  // Mutations
  const mergeMutation = trpc.model.mergeToCore.useMutation({
    onSuccess: (res) => {
      alert(`Success! Merged ${res.imported} models into the C.O.R.E database.`);
      utils.model.list.invalidate();
    },
  });

  const clearMutation = trpc.model.clearCoreModels.useMutation({
    onSuccess: () => utils.model.list.invalidate(),
  });

  const saveMappingMutation = trpc.model.saveTableMapping.useMutation({
    onSuccess: () => alert('Mapping saved. Future imports will use this schema.'),
  });



  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
      {/* Control Bar */}
      <div className="flex-none p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-4">
        {/* Source Select */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-500/10 rounded flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Database size={16} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Source Data</label>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
            >
              <option value="openrouterfree">openrouterfree (Raw)</option>
              <option value="raw_datalake">raw_datalake (Dump)</option>
            </select>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Provider Select */}
          <div className="flex flex-col items-end">
            <label className="text-[9px] font-bold text-zinc-500 uppercase">Attach to Provider</label>
            <select
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-300 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="">-- Choose Provider --</option>
              {providers?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-8 w-px bg-zinc-800 mx-2" />

          {/* Action Buttons */}
          <button
            onClick={() => saveMappingMutation.mutate({ tableName: selectedTable, mapping: columnMapping })}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs font-bold text-zinc-300 transition-all"
            title="Save current Column Mapping"
          >
            <Save size={14} /> Map
          </button>

          <button
            onClick={() => clearMutation.mutate()}
            className="p-2 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded transition-colors"
            title="Clear All C.O.R.E Models"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={() => {
              if (!providerId) return alert('Please select a Target Provider first.');
              mergeMutation.mutate({ sourceTableName: selectedTable, providerId });
            }}
            disabled={mergeMutation.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-bold text-xs uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all"
          >
            {mergeMutation.isLoading ? <RefreshCw className="animate-spin" size={14} /> : <ArrowRight size={14} />} Merge to C.O.R.E.
          </button>
        </div>
      </div>

      {/* Instruction Bar */}
      <div className="flex-none bg-indigo-900/10 border-b border-indigo-500/20 px-4 py-2 flex items-center gap-3 text-[10px] text-indigo-300">
        <AlertCircle size={12} />
        <span><b>INSTRUCTIONS:</b> Double-click any Column Header below to rename it to a valid C.O.R.E. field (e.g. <code>contextWindow</code>, <code>costPer1k</code>, <code>name</code>). Then click <b>Map</b> to save schema.</span>
      </div>

      {/* Data Grid */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 gap-2">
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            Loading Data...
          </div>
        ) : (
          <UniversalDataGrid
            data={rawData || []}
            columnMapping={columnMapping}
            onColumnMapChange={(orig, mapped) => setColumnMapping(prev => ({ ...prev, [orig]: mapped }))}
          />
        )}
      </div>
    </div>
  );
};
