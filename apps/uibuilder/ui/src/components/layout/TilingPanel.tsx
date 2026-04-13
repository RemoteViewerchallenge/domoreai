import { useNode, useEditor, Element } from '@craftjs/core';
import { Box } from '@mui/material';
import { TilingSpreadsheet } from './TilingPanel.spreadsheet';

export const TilingPanel = ({ 
  bgColor = '#1a1a1a', 
  borderCol = '#333', 
  isFlipped = false 
}: any) => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();

  return (
    <Box
      ref={(ref: any) => connect(drag(ref))}
      onClick={(e: any) => {
        e.stopPropagation();
        actions.selectNode(id);
      }}
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: bgColor,
        border: `1px solid ${borderCol}`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      } as any}
    >
      {isFlipped ? (
        <TilingSpreadsheet />
      ) : (
        <Element 
          id="panel-content" 
          is={Box as any} 
          canvas 
          sx={{ flex: 1, border: '1px dashed rgba(255,255,255,0.05)' }} 
        />
      )}
    </Box>
  );
};

TilingPanel.craft = {
  props: {
    isFlipped: false,
    bgColor: '#1a1a1a',
    borderCol: '#333',
  },
};