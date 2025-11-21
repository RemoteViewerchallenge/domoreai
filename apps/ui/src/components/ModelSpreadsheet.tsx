/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';

interface ModelSpreadsheetProps {
  data: any[];
  columns: any[];
}

export const ModelSpreadsheet: React.FC<ModelSpreadsheetProps> = ({ data, columns }) => {
  const jRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<any>(null);

  useEffect(() => {
    if (!jRef.current) return;

    const options = {
      worksheets: [{
        data: data,
        columns: columns,
        minDimensions: [10, 10] as [number, number], // Fix tuple type
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: '500px',
      }],
    };

    spreadsheetRef.current = jspreadsheet(jRef.current, options);

    return () => {
      if (spreadsheetRef.current) {
        spreadsheetRef.current.destroy();
      }
    };
  }, [data, columns]);

  return (
    <div className="w-full h-full">
      <div ref={jRef} />
    </div>
  );
};
