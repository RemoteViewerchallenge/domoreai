import React from 'react';

interface SimpleTableViewProps {
  rawData: unknown;
}

/**
 * Simple table view for raw data - no fancy spreadsheet, just displays the data
 */
export const SimpleTableView: React.FC<SimpleTableViewProps> = ({ rawData }) => {
  // Handle different response formats
  let dataArray: Record<string, unknown>[] = [];
  
  if (Array.isArray(rawData)) {
    dataArray = rawData as Record<string, unknown>[];
  } else if (rawData && typeof rawData === 'object') {
    const dataObj = rawData as { data?: unknown; models?: unknown };
    if (Array.isArray(dataObj.data)) {
      dataArray = dataObj.data as Record<string, unknown>[];
    } else if (Array.isArray(dataObj.models)) {
      dataArray = dataObj.models as Record<string, unknown>[];
    }
  } else {
    return (
      <div className="p-4 text-sm text-gray-500">
        <pre className="bg-base-200 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </div>
    );
  }

  if (dataArray.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No data available</div>;
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  dataArray.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys);

  return (
    <div className="overflow-auto h-full">
      <table className="table table-xs table-pin-rows table-pin-cols">
        <thead>
          <tr>
            <th className="bg-base-200">#</th>
            {headers.map((header, idx) => (
              <th key={idx} className="bg-base-200">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataArray.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover">
              <td className="bg-base-200 font-bold">{rowIdx + 1}</td>
              {headers.map((header, colIdx) => {
                const value = row[header];
                const displayValue = typeof value === 'object' 
                  ? JSON.stringify(value) 
                  : String(value ?? '');
                return (
                  <td key={colIdx} className="max-w-xs truncate" title={displayValue}>
                    {displayValue}
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
