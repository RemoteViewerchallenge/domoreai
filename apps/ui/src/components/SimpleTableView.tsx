import React from 'react';

interface SimpleTableViewProps {
  rawData: unknown;
}

/**
 * Simple table view for raw data - no fancy spreadsheet, just displays the data
 */
export const SimpleTableView: React.FC<SimpleTableViewProps> = ({ rawData }) => {
  // State to track hidden columns
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<string>>(new Set());
  // State for column widths
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  // State for resizing
  const [resizing, setResizing] = React.useState<{ col: string; startX: number; startWidth: number } | null>(null);

  // Helper to toggle column visibility
  const toggleColumn = (col: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  // Helper to reset hidden columns
  const resetColumns = () => setHiddenColumns(new Set());

  // Handle resizing events
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff); // Min width 50px
      setColumnWidths(prev => ({ ...prev, [resizing.col]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

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
      <div className="p-4 text-sm text-[var(--color-text-secondary)]">
        <pre className="bg-base-200 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </div>
    );
  }

  if (dataArray.length === 0) {
    return <div className="p-4 text-sm text-[var(--color-text-secondary)]">No data available</div>;
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  dataArray.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });
  let headers = Array.from(allKeys);
  // Filter out hidden columns for rendering
  headers = headers.filter(h => !hiddenColumns.has(h));

  return (
    <div className="overflow-auto h-full w-full">
      <table className="table table-xs table-pin-rows table-pin-cols">
        <thead>
          <tr>
            <th className="bg-base-200 text-white w-10">#</th>
            {headers.map((header, idx) => (
              <th 
                key={idx} 
                className="bg-base-200 text-white relative group"
                style={{ width: columnWidths[header] || 150, minWidth: 50 }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="cursor-pointer truncate" 
                    onClick={() => toggleColumn(header)} 
                    title="Click to hide"
                  >
                    {header}
                  </span>
                  {/* Resize Handle */}
                  <div
                    className="w-1 h-4 bg-base-content/20 cursor-col-resize hover:bg-primary absolute right-0 top-1/2 -translate-y-1/2"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizing({ 
                        col: header, 
                        startX: e.clientX, 
                        startWidth: columnWidths[header] || 150 
                      });
                    }}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataArray.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover">
              <td className="bg-base-200 font-bold text-white">{rowIdx + 1}</td>
              {headers.map((header, colIdx) => {
                const value = row[header];
                const displayValue = typeof value === 'object' 
                  ? JSON.stringify(value) 
                  : ((value === null || value === undefined) ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value as any)));
                return (
                  <td 
                    key={colIdx} 
                    className="truncate text-white border-r border-base-content/5" 
                    style={{ maxWidth: columnWidths[header] || 150 }}
                    title={displayValue}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {/* Reset hidden columns button */}
        <tfoot>
          <tr>
            <td colSpan={headers.length + 1} className="bg-base-200 text-center">
              <button className="btn btn-xs btn-ghost" onClick={resetColumns}>Reset Columns</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
