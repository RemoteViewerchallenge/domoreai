import { Editor as CraftEditor, Frame, Element } from '@craftjs/core';
import { Box } from '@mui/material';
import { TilingPanel } from './TilingPanel';
import { CanvasGrid } from '../ui/CanvasGrid';
import { Button } from '../elements/Button';
import { Text } from '../elements/Text';
import { ContextMenu } from '../../core/ContextMenu';

export const Editor = () => {
  return (
    <CraftEditor resolver={{ TilingPanel, CanvasGrid, Button, Text, Box }}>
      <ContextMenu>
        <Box sx={{ width: '100vw', height: '100vh', bgcolor: '#000' }}>
          <Frame>
            {/* id="ROOT" is critical for the ContextMenu add function */}
            <Element is={CanvasGrid as any} canvas id="ROOT" rows={1} cols={1}>
              <TilingPanel />
            </Element>
          </Frame>
        </Box>
      </ContextMenu>
    </CraftEditor>
  );
};