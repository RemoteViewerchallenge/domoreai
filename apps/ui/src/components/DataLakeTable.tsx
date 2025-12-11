import React from 'react';
import { trpc } from '../utils/trpc.js';
import { Trash2 } from 'lucide-react';

export const DataLakeTable: React.FC = () => {
  const { data: rawData, isLoading, refetch } = trpc.providers.getRawData.useQuery();
  const deleteMutation = trpc.providers.deleteRawData.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) return <div className="text-xs">Loading data...</div>;

  return (
    <div className="overflow-x-auto h-full">
      <table className="table table-xs table-pin-rows w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Provider</th>
            <th>Ingested At</th>
            <th>Data Summary</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rawData?.map((row) => (
            <tr key={row.id} className="hover">
              <td className="font-mono text-[10px] opacity-70">{row.id.substring(0, 8)}...</td>
              <td className="text-xs font-semibold">{row.provider}</td>
              <td className="text-xs whitespace-nowrap">
                {new Date(row.ingestedAt).toLocaleString()}
              </td>
              <td className="text-xs font-mono text-[var(--color-text-secondary)] truncate max-w-md">
                {JSON.stringify(row.rawData).substring(0, 150)}
              </td>
              <td className="text-right">
                <button 
                  className="btn btn-ghost btn-xs btn-square text-error"
                  onClick={() => {
                    if (confirm('Delete this record?')) {
                      deleteMutation.mutate({ id: row.id });
                    }
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
          {rawData?.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-[var(--color-text-secondary)] py-8">
                Data Lake is empty. Ingest data from the sidebar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
