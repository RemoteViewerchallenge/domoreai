import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { RawDataSpreadsheet } from '../components/RawDataSpreadsheet.js';
import { Trash2, Download } from 'lucide-react';

export const RawDataExplorer: React.FC = () => {
  const { data: rawDataRecords, isLoading, refetch } = trpc.providers.getRawData.useQuery();
  const deleteMutation = trpc.providers.deleteRawData.useMutation({
    onSuccess: () => refetch(),
  });

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  if (isLoading) return <div className="text-xs p-4">Loading data...</div>;

  const selectedRecord = rawDataRecords?.find(r => r.id === selectedRecordId);

  return (
    <div className="flex h-full overflow-hidden bg-base-300">
      {/* Left Sidebar: Record List */}
      <div className="w-64 bg-base-100 border-r border-base-content/10 flex flex-col overflow-y-auto">
        <div className="p-2 border-b border-base-content/10 bg-base-200">
          <h2 className="text-xs font-bold uppercase tracking-wider">Raw Data Records</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rawDataRecords?.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelectedRecordId(record.id)}
              className={`card p-2 rounded cursor-pointer transition-colors ${
                selectedRecordId === record.id ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold truncate">{record.provider}</div>
                  <div className="text-[10px] opacity-70">
                    {new Date(record.ingestedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this record?')) {
                      deleteMutation.mutate({ id: record.id });
                      if (selectedRecordId === record.id) {
                        setSelectedRecordId(null);
                      }
                    }
                  }}
                  className="btn btn-ghost btn-xs btn-square text-error"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {rawDataRecords?.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-8">
              No data yet. Ingest from providers.
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Spreadsheet */}
      <div className="flex-1 flex flex-col overflow-hidden bg-base-100">
        <div className="p-2 border-b border-base-content/10 flex justify-between items-center bg-base-200">
          <h1 className="text-sm font-bold">
            {selectedRecord ? `${selectedRecord.provider} - Raw Data` : 'Select a record'}
          </h1>
          {selectedRecord && (
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
          )}
        </div>
        <div className="flex-1 overflow-hidden p-2">
          {selectedRecord ? (
            <RawDataSpreadsheet
              rawData={selectedRecord.rawData}
              onSave={(data) => {
                console.log('Spreadsheet data changed:', data);
                // TODO: Implement save to database
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a raw data record from the sidebar to view in spreadsheet format
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
