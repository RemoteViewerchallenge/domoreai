import React from 'react';
import { trpc } from '../utils/trpc.js';
import { ModelSpreadsheet } from '../components/ModelSpreadsheet.js';

export const DataExplorer: React.FC = () => {
  const { data: rawData, isLoading, refetch } = trpc.providers.getRawData.useQuery();
  const deleteMutation = trpc.providers.deleteRawData.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) return <div>Loading...</div>;

  // Transform rawData into spreadsheet format
  interface RawDataRow {
    id: string;
    provider: string;
    ingestedAt: string | Date;
    rawData: unknown;
  }

  const spreadsheetData = rawData?.map((row: RawDataRow) => ({
    id: row.id,
    provider: row.provider,
    ingestedAt: new Date(row.ingestedAt), // Ensure Date object
    dataSummary: JSON.stringify(row.rawData).substring(0, 100) + '...',
  })) || [];

  const columns = [
    { type: 'text', title: 'ID', width: 100 },
    { type: 'text', title: 'Provider', width: 100 },
    { type: 'text', title: 'Ingested At', width: 200 },
    { type: 'text', title: 'Data Summary', width: 400 },
    { type: 'text', title: 'Actions', width: 100 }, // Add Actions column
  ];

  const handleDelete = (id: string) => {
    if (confirm('Delete this record?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Raw Data Lake Explorer</h1>
      
      <div className="mb-4">
        <p className="text-gray-600">
          This page shows raw data ingested from providers. Go to the <a href="/providers" className="text-blue-500 underline">Provider Manager</a> to ingest new data.
        </p>
      </div>

      <div className="border rounded p-2">
        <ModelSpreadsheet 
          data={spreadsheetData} 
          columns={columns} 
          onDelete={handleDelete} // Pass delete handler
        />
      </div>
    </div>
  );
};
