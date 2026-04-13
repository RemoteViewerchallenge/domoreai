import { useNode } from '@craftjs/core';
import { Box } from '@mui/material';
import { SpreadsheetView } from '../elements/SpreadsheetView';

export const CanvasGrid = ({ children, rows = 1, cols = 1, isFlipped = false }: any) => {
  const { connectors: { connect } } = useNode();

  // Flip the background to change Rows/Cols
  if (isFlipped) {
    return (
      <Box ref={(ref: any) => connect(ref)} sx={{ width: '100vw', height: '100vh', bgcolor: '#111' }}>
         <SpreadsheetView />
      </Box>
    );
  }

  return (
    <Box
      ref={(ref: any) => connect(ref)}
      sx={{
        display: 'grid',
        // Controls the split: repeat(1, 1fr) = 100%
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '2px',
        width: '100vw',
        height: '100vh',
        bgcolor: '#000',
      }}
    >
      {children}
    </Box>
  );
};

CanvasGrid.craft = {
  props: {
    rows: 1,
    cols: 1,
    isFlipped: false,
  },
};