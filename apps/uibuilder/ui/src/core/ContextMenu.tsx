/* ═══════════════════════════════════════════════════════════════
   ContextMenu.tsx — Right-click context menu
   Provides actions for adding layouts and managing layers.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useCallback, useRef, type ReactNode } from 'react';
import { useEditor } from '@craftjs/core';
import { Menu, MenuItem, Divider } from '@mui/material';
import { GridLayout } from '../components/layout/GridLayout';

interface MenuState {
  mouseX: number;
  mouseY: number;
  nodeId: string | null;
}

export const ContextMenu = ({ children, onShowLayers }: { children: ReactNode; onShowLayers?: () => void }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { actions, query } = useEditor();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let nodeId: string | null = null;
    let el = e.target as HTMLElement | null;

    while (el && el !== containerRef.current) {
      if (el.dataset.craftNodeId) {
        nodeId = el.dataset.craftNodeId;
        break;
      }
      el = el.parentElement;
    }

    setMenu({ mouseX: e.clientX, mouseY: e.clientY, nodeId });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  const addLayout = useCallback((parentId: string) => {
    const tree = query.parseReactElement(<GridLayout />).toNodeTree();
    actions.addNodeTree(tree, parentId);
    close();
  }, [actions, query, close]);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId !== 'ROOT') actions.delete(nodeId);
    close();
  }, [actions, close]);

  const renderMenuItems = () => {
    if (!menu || !menu.nodeId) return null;
    const { nodeId } = menu;

    let displayName = 'Unknown';
    let isCanvas = false;
    try {
      const node = query.node(nodeId).get();
      displayName = node.data.displayName || node.data.name || 'Unknown';
      isCanvas = node.data.isCanvas;
    } catch { }

    const items: React.ReactNode[] = [];

    items.push(
      <MenuItem key="layers" onClick={() => { onShowLayers?.(); close(); }} sx={menuItemSx}>
        Show Layers Sidebar
      </MenuItem>
    );

    if (nodeId !== 'ROOT') {
      items.push(
        <MenuItem key="delete" onClick={() => deleteNode(nodeId)} sx={{ ...menuItemSx, color: '#ef4444' }}>
          Delete {displayName}
        </MenuItem>
      );
    }

    items.push(<Divider key="d1" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />);

    // Add layout is allowed if it's a Canvas or a Cell
    if (nodeId === 'ROOT' || isCanvas || displayName.toLowerCase().includes('cell')) {
      items.push(
        <MenuItem key="add-layout" onClick={() => addLayout(nodeId)} sx={menuItemSx}>
          Add Layout Here
        </MenuItem>
      );
    }

    return items;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
      <Menu
        open={menu !== null}
        onClose={close}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#09090b',
              color: '#fff',
              border: '1px solid #27272a',
              borderRadius: 1,
              minWidth: 180,
              py: 0.5,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.9)',
            },
          },
        }}
      >
        {renderMenuItems()}
      </Menu>
    </div>
  );
};

const menuItemSx = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#fff',
  py: 0.8,
  px: 2,
  minHeight: 32,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
} as const;