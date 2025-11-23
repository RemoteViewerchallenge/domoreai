import React, { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface UniversalDataGridProps {
  data: any[];
  tableName?: string;
  onCellEdit?: (rowId: string, field: string, newValue: any) => void;
  onColumnAdded?: (name: string, type: string) => void;
}

export const UniversalDataGrid: React.FC<UniversalDataGridProps> = ({ 
  data, 
  tableName, 
  onCellEdit,
  onColumnAdded 
}) => {
  
  // 1. Dynamic Column Generation
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    
    const keys = Object.keys(data[0]);
    return keys.map(key => ({
      field: key,
      headerName: key.toUpperCase(),
      editable: key !== 'id',
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 150,
      // Custom value formatter to handle objects/arrays
      valueFormatter: (params) => {
        const value = params.value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
      cellStyle: params => {
        if (typeof params.value === 'number') return { color: '#4ade80' };
        return undefined;
      }
    }));
  }, [data]);

  // 2. Handle Edits
  const onCellValueChanged = useCallback((event: any) => {
    if (onCellEdit && event.data?.id) {
      onCellEdit(event.data.id, event.colDef.field!, event.newValue);
    }
  }, [onCellEdit]);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4">
        <span className="text-xs font-mono text-white font-bold">
          {tableName ? `EDITING: ${tableName}` : 'SELECT A TABLE'}
        </span>
        
        {tableName && (
          <button 
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] text-white rounded border border-zinc-700 transition-colors"
            onClick={() => {
              const name = prompt("New Column Name?");
              if (name && onColumnAdded) onColumnAdded(name, 'TEXT');
            }}
          >
            + ADD COLUMN
          </button>
        )}
      </div>

      {/* The Grid */}
      <div className="flex-1 ag-theme-alpine-dark" style={{ width: '100%', height: '100%' }}>
        <AgGridReact
          theme="legacy"
          rowData={data}
          columnDefs={columnDefs}
          defaultColDef={{
            flex: 1,
            minWidth: 150,
            resizable: true,
            sortable: true,
            filter: true,
          }}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          rowSelection="multiple"
          pagination={true}
          paginationPageSize={100}
          domLayout="normal"
        />
      </div>
    </div>
  );
};
