import React, { useRef, useEffect } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';

interface RawDataSpreadsheetProps {
  rawData: any; // The raw JSON data from the provider
  onSave?: (data: any[][]) => void;
}

/**
 * Flattens a nested object into a single-level object with dot notation keys
 * Example: {pricing: {prompt: 0.5}} => {"pricing.prompt": 0.5}
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
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
function jsonToSpreadsheet(rawData: any): { headers: string[], data: any[][] } {
  // Handle different response formats
  let dataArray: any[] = [];
  
  if (Array.isArray(rawData)) {
    dataArray = rawData;
  } else if (rawData?.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
  } else if (rawData?.models && Array.isArray(rawData.models)) {
    dataArray = rawData.models;
  } else {
    console.warn('Unknown data format:', rawData);
    return { headers: ['raw'], data: [[JSON.stringify(rawData)]] };
  }

  if (dataArray.length === 0) {
    return { headers: [], data: [] };
  }

  // Flatten all objects and collect all unique keys
  const flattenedObjects = dataArray.map(obj => flattenObject(obj));
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
      return String(value);
    });
  });

  return { headers, data };
}

export const RawDataSpreadsheet: React.FC<RawDataSpreadsheetProps> = ({ rawData, onSave }) => {
  const jRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<any>(null);

  useEffect(() => {
    console.log('[RawDataSpreadsheet] useEffect triggered', { hasRef: !!jRef.current, hasData: !!rawData });
    
    if (!jRef.current || !rawData) {
      console.log('[RawDataSpreadsheet] Early return - missing ref or data');
      return;
    }

    // Clean up existing spreadsheet
    if (spreadsheetRef.current) {
      try {
        console.log('[RawDataSpreadsheet] Destroying existing spreadsheet');
        jspreadsheet.destroy(jRef.current as any, true);
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
        if (!jRef.current) {
          console.error('[RawDataSpreadsheet] Container disappeared before initialization');
          return;
        }

        // Initialize jspreadsheet
        const instance = jspreadsheet(jRef.current, {
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
              const currentData = spreadsheetRef.current.getData();
              onSave(currentData);
            }
          },
        });
        
        spreadsheetRef.current = instance;
        console.log('[RawDataSpreadsheet] Spreadsheet initialized successfully', instance);
      } catch (error) {
        console.error('[RawDataSpreadsheet] Failed to initialize spreadsheet:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const elementToClean = jRef.current;
      if (spreadsheetRef.current && elementToClean) {
        try {
          console.log('[RawDataSpreadsheet] Cleanup: destroying spreadsheet');
          jspreadsheet.destroy(elementToClean as any, true);
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
