import React from 'react';
import { Card } from 'flyonui';
import { Button } from 'flyonui';
import Jspreadsheet from '@jspreadsheet/react';
import { trpc } from '../../utils/trpc';

const SpreadsheetPage: React.FC = () => {
  const { data, error, isLoading } = trpc.external.getOpenRouterRaw.useQuery();
  const saveModel = trpc.model.saveNormalizedModel.useMutation();

  const handleFilter = () => {
    // TODO: Implement filtering logic.
  };

  const handleSave = () => {
    // TODO: Implement save logic.
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Card>
      <h1>Spreadsheet</h1>
      <Jspreadsheet data={data} />
      <Button onClick={handleFilter}>Filter Free Models</Button>
      <Button onClick={handleSave}>Save to C.O.R.E.</Button>
    </Card>
  );
};

export default SpreadsheetPage;
