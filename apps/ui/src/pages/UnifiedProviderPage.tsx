import React, { useState } from 'react';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderList } from '../components/ProviderList.js';
import { SimpleTableView } from '../components/SimpleTableView.js';
import { trpc } from '../utils/trpc.js';
import { Download, Database, Table, Sparkles, ArrowRight } from 'lucide-react';
import { VisualQueryBuilder } from '../components/VisualQueryBuilder.js';
// Removed unused saved queries import
import { Link } from 'react-router-dom';

const UnifiedProviderPage: React.FC = () => {
  const utils = trpc.useContext();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedFlattenedTable, setSelectedFlattenedTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'flattened' | 'query'>('raw');
  const [selectedQueryString, setSelectedQueryString] = useState<string>('');
  const [queryResults, setQueryResults] = useState<unknown[] | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualProviderName, setManualProviderName] = useState('');
  const [manualEntryData, setManualEntryData] = useState('');
  
  const { data: providers } = trpc.providers.list.useQuery();
  const { data: rawDataRecords } = trpc.providers.getRawData.useQuery();
  const { data: flattenedTables } = trpc.dataRefinement.listFlattenedTables.useQuery();
  const { data: flattenedTableData } = trpc.dataRefinement.getTableData.useQuery(
    { tableName: selectedFlattenedTable || '', limit: 100 },
    { enabled: !!selectedFlattenedTable && viewMode === 'flattened' }
  );
  
  const debugFetchMutation = trpc.providers.debugFetch.useMutation({
    onSuccess: () => {
      utils.providers.getRawData.invalidate();
    },
    onError: (error) => {
      alert(`Ingestion failed: ${error.message}`);
    },
  });

  const flattenMutation = trpc.dataRefinement.flattenRawData.useMutation({
    onSuccess: () => {
      utils.dataRefinement.listFlattenedTables.invalidate();
      alert('Data flattened successfully!');
    },
    onError: (error) => {
      alert(`Flatten failed: ${error.message}`);
    },
  });

  const executeQueryMutation = trpc.dataRefinement.executeQuery.useMutation({
    onSuccess: (data: unknown) => {
      setQueryResults(data as unknown[]);
      setViewMode('query');
    },
    onError: (error) => alert(`Query failed: ${error.message}`)
  });

  const promoteToModelsMutation = trpc.dataRefinement.promoteDataToModels.useMutation({
    onSuccess: (data: { message: string }) => {
      alert(data.message);
      utils.providers.list.invalidate();
    },
    onError: (error) => alert(`Promotion failed: ${error.message}`)
  });

  const saveQueryResultsMutation = trpc.dataRefinement.saveQueryResults.useMutation({
    onSuccess: () => {
      utils.dataRefinement.listFlattenedTables.invalidate();
      alert('Table saved successfully!');
    },
    onError: (error) => alert(`Save failed: ${error.message}`)
  });

  const createRawDataMutation = trpc.providers.createRawData.useMutation({
    onSuccess: () => {
      utils.providers.getRawData.invalidate();
      setIsManualEntryOpen(false);
      setManualEntryData('');
    },
    onError: (error) => alert(`Creation failed: ${error.message}`)
  });

  const handleIngest = (providerId: string) => {
    debugFetchMutation.mutate({ providerId });
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    setViewMode('raw');
  };

  const handleFlattenedTableSelect = (tableName: string) => {
    setSelectedFlattenedTable(tableName);
    setViewMode('flattened');
  };

  const handleFlatten = () => {
    if (!selectedRecord) return;
    
    const tableName = prompt('Enter table name:', `${selectedRecord.provider}_models`);
    if (!tableName) return;

    flattenMutation.mutate({
      rawDataId: selectedRecord.id,
      tableName: tableName,
    });
  };

  // Find the selected provider and then find its raw data
  const selectedProvider = selectedProviderId 
    ? providers?.find(p => p.id === selectedProviderId)
    : null;
  
  // Match by provider name (RawDataLake stores provider name, not ID)
  const selectedRecord = selectedProvider
    ? rawDataRecords?.find(r => r.provider.toLowerCase() === selectedProvider.name.toLowerCase())
    : null;

  // Debug logging
  console.log('[UnifiedProviderPage] Debug:', {
    selectedProviderId,
    selectedProviderName: selectedProvider?.name,
    rawDataRecords: rawDataRecords?.map(r => ({ id: r.id, provider: r.provider })),
    selectedRecord: selectedRecord ? { id: selectedRecord.id, provider: selectedRecord.provider } : null,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base-300 text-base-content">
      {/* Navigation Header */}
      <div className="flex-none h-12 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-cyan-500" size={16} />
          <span className="text-lg font-bold tracking-wider text-zinc-200">PROVIDER MANAGER</span>
        </div>
        <Link 
          to="/data-lake"
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-700 rounded transition-all text-xs"
        >
          Go to Data Lake <ArrowRight size={14} />
        </Link>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-base-100 border-r border-base-content/10 flex flex-col p-2 overflow-y-auto">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Providers</h2>
        <AddProviderForm onSuccess={() => utils.providers.list.invalidate()} />
        <button 
          className="btn btn-xs btn-outline btn-accent w-full mb-2"
          onClick={() => setIsManualEntryOpen(true)}
        >
          + Manual Entry
        </button>
        <ProviderList onIngest={handleIngest} onSelect={handleProviderSelect} />
        
        {/* Flattened Tables Section */}
        <div className="mt-4 pt-4 border-t border-base-content/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
            <Table size={12} />
            Flattened Tables
          </h2>
          <div className="space-y-1">
            {flattenedTables?.map((table) => (
              <div
                key={table.id}
                onClick={() => handleFlattenedTableSelect(table.name)}
                className={`card p-2 rounded-md cursor-pointer transition-colors text-xs ${
                  selectedFlattenedTable === table.name
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <div className="font-semibold">{table.name}</div>
                <div className="text-[10px] opacity-70">{table.rowCount} rows</div>
              </div>
            ))}
            {(!flattenedTables || flattenedTables.length === 0) && (
              <div className="text-xs text-gray-500 italic">No flattened tables yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto bg-base-100">
        <div className="p-2 border-b border-base-content/10 flex justify-between items-center bg-base-200">
          <h1 className="text-sm font-bold">
            {viewMode === 'raw' && selectedRecord && `${selectedRecord.provider} - Raw Data`}
            {viewMode === 'flattened' && selectedFlattenedTable && `${selectedFlattenedTable} - Flattened Table`}
            {!selectedRecord && !selectedFlattenedTable && 'Select a provider or table to view data'}
          </h1>
          <div className="flex items-center gap-2">
            {/* Query Promotion Workflow */}
            {viewMode === 'raw' && selectedRecord && (
              <div className="flex flex-col gap-2 w-full bg-base-200 p-2 border-b border-base-content/10">
                <VisualQueryBuilder
                  tables={['RawDataLake', ...(flattenedTables?.map(t => t.name) || [])]}
                  onExecute={(sql) => {
                    setSelectedQueryString(sql);
                    executeQueryMutation.mutate({ query: sql });
                  }}
                  onSaveTable={(sql, name) => {
                    saveQueryResultsMutation.mutate({ query: sql, newTableName: name });
                  }}
                  isLoading={executeQueryMutation.isLoading}
                />
                
                {/* Promotion Button (kept separate as it's specific to this page) */}
                {queryResults && (
                  <div className="flex justify-end px-4 pb-2">
                    <button
                      onClick={() => {
                        const provider = selectedProvider?.name.toLowerCase();
                        if (provider) {
                          promoteToModelsMutation.mutate({ 
                            query: selectedQueryString, 
                            providerId: provider 
                          });
                        }
                      }}
                      disabled={promoteToModelsMutation.isLoading}
                      className="btn btn-sm btn-success gap-1"
                    >
                      <Sparkles size={14} />
                      {promoteToModelsMutation.isLoading ? 'Promoting...' : 'Promote to Models'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Old Flatten Workflow (Optional) */}
            {viewMode === 'raw' && selectedRecord && (
              <>
                <button
                  onClick={handleFlatten}
                  disabled={flattenMutation.isLoading}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <Database size={12} />
                  {flattenMutation.isLoading ? 'Flattening...' : 'Flatten to Table'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(selectedRecord.rawData, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedRecord.provider}-${selectedRecord.id}.json`;
                    a.click();
                  }}
                  className="btn btn-xs btn-ghost gap-1"
                >
                  <Download size={12} />
                  Export JSON
                </button>
              </>
            )}
            <div className="text-xs text-gray-500">
              {debugFetchMutation.isLoading && 'Ingesting...'}
              {flattenMutation.isLoading && 'Flattening...'}
              {!debugFetchMutation.isLoading && !flattenMutation.isLoading && 'Ready'}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2">
          {viewMode === 'query' && queryResults ? (
            <>
              <div className="p-2 bg-zinc-900 border-b border-zinc-800">
                <span className="text-xs text-cyan-400">Query Results: {queryResults.length} rows</span>
              </div>
              <SimpleTableView rawData={queryResults} />
            </>
          ) : viewMode === 'raw' && selectedRecord ? (
            <SimpleTableView rawData={selectedRecord.rawData} />
          ) : viewMode === 'flattened' && flattenedTableData ? (
            <SimpleTableView rawData={flattenedTableData.rows} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Click a provider to view raw data, or a flattened table to view structured data
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Manual Entry Modal */}
      {isManualEntryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-200 p-4 rounded-lg w-96 shadow-xl border border-base-content/20">
            <h3 className="font-bold text-lg mb-4">Add Manual Raw Data</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Provider Name (e.g. 'Manual')"
                className="input input-sm input-bordered w-full"
                value={manualProviderName}
                onChange={(e) => setManualProviderName(e.target.value)}
              />
              <textarea
                placeholder="JSON Data"
                className="textarea textarea-bordered w-full h-48 font-mono text-xs"
                value={manualEntryData}
                onChange={(e) => setManualEntryData(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIsManualEntryOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  disabled={createRawDataMutation.isLoading || !manualProviderName || !manualEntryData}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(manualEntryData);
                      createRawDataMutation.mutate({
                        provider: manualProviderName,
                        rawData: parsed
                      });
                    } catch {
                      alert('Invalid JSON');
                    }
                  }}
                >
                  {createRawDataMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedProviderPage;
