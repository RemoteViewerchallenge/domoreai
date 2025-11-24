import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'; 

ModuleRegistry.registerModules([AllCommunityModule]);

interface GridProps {
  data: Record<string, unknown>[];
  onEdit?: (rowId: string, colId: string, newVal: string | number | boolean | null) => void; 
}

export const UniversalDataGrid: React.FC<GridProps> = ({ data, onEdit }) => {
  
  const colDefs = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).map(field => ({ 
      field, 
      filter: true,
      editable: field !== 'id' && field !== 'createdAt', // Protect IDs
      cellDataType: false // Allow loose typing for easier edits
    }));
  }, [data]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
       <AgGridReact
          theme={themeQuartz.withParams({
              backgroundColor: "#09090b", // zinc-950
              headerBackgroundColor: "#18181b", // zinc-900
              borderColor: "#27272a",
              rowHoverColor: "#27272a",
              foregroundColor: "#e4e4e7",
          })}
          rowData={data}
          columnDefs={colDefs}
          // 1. Handle Edits
          onCellValueChanged={(params) => {
             if (onEdit && params.data.id) {
                onEdit(String(params.data.id), params.colDef.field!, params.newValue);
             }
          }}
       />
    </div>
  );
};
