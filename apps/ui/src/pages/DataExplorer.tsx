import React from 'react';
import { trpc } from '../utils/trpc.js';
import { ModelSpreadsheet } from '../components/ModelSpreadsheet.js';

export const DataExplorer: React.FC = () => {
  const { data: rawData, isLoading } = trpc.provider.getRawData.useQuery();
  
  // Removed unused mutation for now
  // const utils = trpc.useContext();
  // const debugFetchMutation = trpc.provider.debugFetch.useMutation({ ... });

  if (isLoading) return <div>Loading...</div>;

  // Transform rawData into spreadsheet format
  const spreadsheetData = rawData?.map((row: any) => ({
    id: row.id,
    provider: row.provider,
    ingestedAt: row.ingestedAt, // Keep as string or date depending on what jspreadsheet expects
    // We might want to show a summary or specific fields from rawData
    dataSummary: JSON.stringify(row.rawData).substring(0, 100) + '...',
  })) || [];

  const columns = [
    { type: 'text', title: 'ID', width: 100 },
    { type: 'text', title: 'Provider', width: 100 },
    { type: 'text', title: 'Ingested At', width: 200 },
    { type: 'text', title: 'Data Summary', width: 400 },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Raw Data Lake Explorer</h1>
      
      <div className="mb-4">
        {/* Placeholder for triggering ingestion */}
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => {
            // You'd need a provider ID here. For now, just a placeholder.
            alert('Select a provider to ingest from (Implementation Pending)');
          }}
        >
          Ingest Data (Debug)
        </button>
      </div>

      <div className="border rounded p-2">
        <ModelSpreadsheet data={spreadsheetData} columns={columns} />
      </div>
    </div>
  );
};
