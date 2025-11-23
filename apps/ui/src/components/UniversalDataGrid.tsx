import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react'; 
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface UniversalDataGridProps {
  data: Record<string, unknown>[];
}

export const UniversalDataGrid: React.FC<UniversalDataGridProps> = ({ data }) => {
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).map(key => ({
      field: key,
      headerName: key.toUpperCase(),
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
    }));
  }, [data]);

  return (
    <div className="h-full w-full ag-theme-alpine-dark"> 
      <style>{`
        .ag-theme-alpine-dark {
            --ag-background-color: #09090b; /* zinc-950 */
            --ag-header-background-color: #18181b; /* zinc-900 */
            --ag-border-color: #27272a;
            --ag-row-hover-color: #27272a;
            --ag-foreground-color: #e4e4e7;
        }
      `}</style>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        animateRows={true}
        pagination={true}
        paginationPageSize={50}
      />
    </div>
  );
};
