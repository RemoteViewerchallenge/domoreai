import { useNode } from '@craftjs/core';
import { Box } from '@mui/material';
import { SpreadsheetView } from '../elements/SpreadsheetView';

export const CanvasGrid = ({ children, isFlipped = false }: any) => {
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
        width: '100vw',
        height: '100vh',
        bgcolor: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {children}
    </Box>
  );
};

CanvasGrid.craft = {
  props: {
    isFlipped: false,
  },
};