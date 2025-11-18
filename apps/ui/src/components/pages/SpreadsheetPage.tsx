import React, { useRef, useState, useEffect } from 'react';
import { trpc } from '../../utils/trpc';
import Jspreadsheet from '@jspreadsheet/react';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const SpreadsheetPage: React.FC = () => {
  const spreadsheetRef = useRef(null);
  const [filtered, setFiltered] = useState(false);
  const { data: rawData, isLoading, error } = trpc.external.getOpenRouterRaw.useQuery();
  const saveModelMutation = trpc.model.saveNormalizedModel.useMutation();

  const handleFilter = () => {
    setFiltered(!filtered);
  };

  const handleSave = () => {
    if (spreadsheetRef.current) {
      const data = (spreadsheetRef.current as any).getData();
      data.forEach((row: any) => {
        const modelData = {
          id: row[0],
          name: row[1],
          description: row[2],
          context_length: parseInt(row[3], 10),
        };
        saveModelMutation.mutate(modelData);
      });
    }
  };

  const columns = [
    { type: 'text', title: 'ID', width: 200 },
    { type: 'text', title: 'Name', width: 200 },
    { type: 'text', title: 'Description', width: 300 },
    { type: 'numeric', title: 'Context Length', width: 150 },
  ];

  const tableData = rawData
    ? (rawData as any[]).filter(row => !filtered || (row.pricing && row.pricing.prompt === '0')).map(row => [row.id, row.name, row.description, row.context_length])
    : [];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Card>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-bold">Data Modeler</h2>
        <div>
          <Button onClick={handleFilter} className="mr-2">
            {filtered ? 'Show All Models' : 'Filter Free Models'}
          </Button>
          <Button onClick={handleSave}>Save to C.O.R.E.</Button>
        </div>
      </div>
      <Jspreadsheet
        ref={spreadsheetRef}
        data={tableData}
        columns={columns}
        minDimensions={[10, 20]}
      />
    </Card>
  );
};
