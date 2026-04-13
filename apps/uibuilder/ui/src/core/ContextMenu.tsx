import { useEditor } from '@craftjs/core';
import { Menu, MenuItem, Box } from '@mui/material';
import { useState } from 'react';
import { TilingPanel } from '../components/layout/TilingPanel';

export const ContextMenu = ({ children }: any) => {
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const { actions, selectedId, query } = useEditor((state) => ({
    selectedId: state.events.selected.size > 0 ? Array.from(state.events.selected)[0] : null
  }));

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY });
  };

  const handleClose = () => setContextMenu(null);

  // Flip whatever is currently selected (Panel or ROOT)
  const flipSelected = () => {
    const targetId = selectedId || 'ROOT';
    actions.setProp(targetId, (props: any) => {
      props.isFlipped = !props.isFlipped;
    });
    handleClose();
  };

  const addPanel = () => {
    const node = query.parseReactElement(<TilingPanel />).toNodeTree();
    actions.addNodeTree(node, 'ROOT');
    handleClose();
  };

  return (
    <Box onContextMenu={handleContextMenu} sx={{ height: '100vh', width: '100vw' }}>
      {children}
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={flipSelected}>
          {selectedId ? 'Flip Panel' : 'Flip Grid Settings'}
        </MenuItem>
        <MenuItem onClick={addPanel}>Add Panel to Cell</MenuItem>
        <MenuItem 
          onClick={() => { if(selectedId) actions.delete(selectedId); handleClose(); }} 
          disabled={!selectedId}
          sx={{ color: 'error.main' }}
        >
          Delete Selected
        </MenuItem>
      </Menu>
    </Box>
  );
};