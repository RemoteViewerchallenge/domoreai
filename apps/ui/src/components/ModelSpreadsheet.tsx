/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

interface ModelSpreadsheetProps {
  data: any[];
  columns: any[];
  onDelete?: (id: string) => void;
}

export const ModelSpreadsheet: React.FC<ModelSpreadsheetProps> = ({ data, columns, onDelete }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-500">No data available. Ingest some data from the Provider Manager!</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="py-2 px-4 border-b bg-gray-100 text-left text-sm font-semibold text-gray-700">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((col, colIndex) => {
                // Special handling for Actions column
                if (col.title === 'Actions') {
                  return (
                    <td key={colIndex} className="py-2 px-4 border-b text-sm text-gray-700">
                      <button 
                        onClick={() => onDelete && onDelete(row.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  );
                }

                const keys = ['id', 'provider', 'ingestedAt', 'dataSummary'];
                const key = keys[colIndex];
                let value = row[key];

                if (value instanceof Date) {
                  value = value.toLocaleString();
                }
                
                return (
                  <td key={colIndex} className="py-2 px-4 border-b text-sm text-gray-700">
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
