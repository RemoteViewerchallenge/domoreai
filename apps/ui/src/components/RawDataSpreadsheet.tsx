import React, { useRef, useEffect } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';

type SpreadsheetData = (string | number | boolean | null | undefined)[][];

interface RawDataSpreadsheetProps {
  rawData: unknown; // The raw JSON data from the provider
  onSave?: (data: SpreadsheetData) => void;
}

/**
 * Flattens a nested object into a single-level object with dot notation keys
 * Example: {pricing: {prompt: 0.5}} => {"pricing.prompt": 0.5}
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Converts raw JSON data into spreadsheet format
 * Automatically detects all unique keys across all objects
 */
function jsonToSpreadsheet(rawData: unknown): { headers: string[], data: SpreadsheetData } {
  // Handle different response formats
  let dataArray: unknown[] = [];
  
  if (Array.isArray(rawData)) {
    dataArray = rawData;
  } else if (rawData && typeof rawData === 'object') {
    const dataObj = rawData as { data?: unknown; models?: unknown };
    if (Array.isArray(dataObj.data)) {
      dataArray = dataObj.data;
    } else if (Array.isArray(dataObj.models)) {
      dataArray = dataObj.models;
    }
  }

  if (dataArray.length === 0) {
    // If rawData is not an array or recognized object, treat as single row if object
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
       return { headers: ['raw'], data: [[JSON.stringify(rawData)]] };
    }
    return { headers: [], data: [] };
  }

  // Flatten all objects and collect all unique keys
  const flattenedObjects = dataArray.map(obj => flattenObject(obj as Record<string, unknown>));
  const allKeys = new Set<string>();
  flattenedObjects.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys).sort();
  
  // Convert to 2D array format for jspreadsheet
  const data = flattenedObjects.map(obj => {
    return headers.map(header => {
      const value = obj[header];
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value as string | number | boolean;
    });
  });

  return { headers, data };
}

export const RawDataSpreadsheet: React.FC<RawDataSpreadsheetProps> = ({ rawData, onSave }) => {
  const jRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<unknown>(null);

  useEffect(() => {
    console.log('[RawDataSpreadsheet] useEffect triggered', { hasRef: !!jRef.current, hasData: !!rawData });
    
    const element = jRef.current;

    if (!element || !rawData) {
      console.log('[RawDataSpreadsheet] Early return - missing ref or data');
      return;
    }

    // Clean up existing spreadsheet
    if (spreadsheetRef.current) {
      try {
        console.log('[RawDataSpreadsheet] Destroying existing spreadsheet');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jspreadsheet.destroy(element as any, true);
        spreadsheetRef.current = null;
      } catch (e) {
        console.warn('Failed to destroy spreadsheet:', e);
      }
    }

    console.log('[RawDataSpreadsheet] Converting JSON to spreadsheet format');
    const { headers, data } = jsonToSpreadsheet(rawData);
    console.log('[RawDataSpreadsheet] Conversion result:', { headerCount: headers.length, rowCount: data.length, headers });

    if (headers.length === 0) {
      console.warn('[RawDataSpreadsheet] No headers found, aborting');
      return;
    }

    // Create column definitions
    const columns = headers.map(header => ({
      type: 'text',
      title: header,
      width: 150,
    }));

    console.log('[RawDataSpreadsheet] Initializing jspreadsheet with', columns.length, 'columns');
    
    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        if (!element) {
          console.error('[RawDataSpreadsheet] Container disappeared before initialization');
          return;
        }

        // Initialize jspreadsheet
        const options = {
          worksheets: [{
            data: data,
            columns: columns,
            minDimensions: [headers.length, Math.max(data.length, 10)],
            allowInsertRow: true,
            allowInsertColumn: true,
            allowDeleteRow: true,
            allowDeleteColumn: true,
            tableOverflow: true,
            tableWidth: '100%',
            tableHeight: '600px',
            onchange: () => {
              if (onSave && spreadsheetRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentData = (spreadsheetRef.current as any)[0].getData(); // Access first worksheet
                onSave(currentData);
              }
            },
          }]
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance = jspreadsheet(element, options as any);
        
        spreadsheetRef.current = instance;
        console.log('[RawDataSpreadsheet] Spreadsheet initialized successfully', instance);
      } catch (error) {
        console.error('[RawDataSpreadsheet] Failed to initialize spreadsheet:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (spreadsheetRef.current && element) {
        try {
          console.log('[RawDataSpreadsheet] Cleanup: destroying spreadsheet');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jspreadsheet.destroy(element as any, true);
          spreadsheetRef.current = null;
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [rawData, onSave]);

  return (
    <div className="w-full h-full overflow-auto bg-white p-4">
      <div className="text-xs mb-2 text-gray-600">
        Spreadsheet Container (Debug: {rawData ? 'Has Data' : 'No Data'})
      </div>
      <div 
        ref={jRef} 
        style={{ 
          minHeight: '400px', 
          width: '100%',
          border: '1px solid #ccc',
          backgroundColor: '#fff'
        }} 
      />
    </div>
  );
};
