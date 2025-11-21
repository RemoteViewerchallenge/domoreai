import React, { useState } from 'react';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderList } from '../components/ProviderList.js';
import { SimpleTableView } from '../components/SimpleTableView.js';
import { trpc } from '../utils/trpc.js';
import { Download, Database, Table } from 'lucide-react';

const UnifiedProviderPage: React.FC = () => {
  const utils = trpc.useContext();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedFlattenedTable, setSelectedFlattenedTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'flattened'>('raw');
  
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-base-300 text-base-content">
      {/* Sidebar */}
      <div className="w-64 bg-base-100 border-r border-base-content/10 flex flex-col p-2 overflow-y-auto">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Providers</h2>
        <AddProviderForm onSuccess={() => utils.providers.list.invalidate()} />
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
      <div className="flex-1 flex flex-col overflow-hidden bg-base-100">
        <div className="p-2 border-b border-base-content/10 flex justify-between items-center bg-base-200">
          <h1 className="text-sm font-bold">
            {viewMode === 'raw' && selectedRecord && `${selectedRecord.provider} - Raw Data`}
            {viewMode === 'flattened' && selectedFlattenedTable && `${selectedFlattenedTable} - Flattened Table`}
            {!selectedRecord && !selectedFlattenedTable && 'Select a provider or table to view data'}
          </h1>
          <div className="flex items-center gap-2">
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
          {viewMode === 'raw' && selectedRecord ? (
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
  );
};

export default UnifiedProviderPage;
