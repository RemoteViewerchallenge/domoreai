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
  nodeId: string;
}

export const ContextMenu = ({ children, onShowLayers }: { children: ReactNode; onShowLayers?: () => void }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { actions, query } = useEditor();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let targetNodeId = 'ROOT';
    let el = e.target as HTMLElement | null;

    // Search for a node ID up the DOM tree
    while (el) {
      if (el.dataset.craftNodeId) {
        targetNodeId = el.dataset.craftNodeId;
        break;
      }
      if (el === containerRef.current) break;
      el = el.parentElement;
    }

    setMenu({ 
      mouseX: e.clientX, 
      mouseY: e.clientY, 
      nodeId: targetNodeId 
    });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  const addLayout = useCallback((parentId: string) => {
    // FIX Prompt 0: Add ONLY the parent GridLayout node.
    // Rely on GridLayout defining its own internal cells/elements.
    const node = query.createNode(React.createElement(GridLayout as any));
    actions.add(node, parentId);
    close();
  }, [actions, query, close]);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId !== 'ROOT') {
      actions.delete(nodeId);
    }
    close();
  }, [actions, close]);

  const renderMenuItems = () => {
    if (!menu) return null;
    const { nodeId } = menu;

    let displayName = 'Layer';
    let isCanvas = false;
    
    try {
      const node = query.node(nodeId).get();
      displayName = node.data.displayName || node.data.name || 'Layer';
      isCanvas = node.data.isCanvas;
    } catch {
      if (nodeId === 'ROOT') {
        displayName = 'Canvas';
        isCanvas = true;
      }
    }

    const items: React.ReactNode[] = [];

    items.push(
      <MenuItem key="layers" onClick={() => { onShowLayers?.(); close(); }} sx={menuItemSx}>
        Open Layers Tree
      </MenuItem>
    );

    if (nodeId !== 'ROOT') {
      items.push(
        <MenuItem key="delete" onClick={() => deleteNode(nodeId)} sx={{ ...menuItemSx, color: '#f87171' }}>
          Delete {displayName}
        </MenuItem>
      );
    }

    items.push(<Divider key="d1" sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />);

    // Logic: Always allow adding layout into ROOT, or into any Canvas/Cell/Layout
    const canAddLayout = nodeId === 'ROOT' || isCanvas || displayName.toLowerCase().includes('cell') || displayName.toLowerCase().includes('layout');
    
    if (canAddLayout) {
      items.push(
        <MenuItem key="add-layout" onClick={() => addLayout(nodeId)} sx={menuItemSx}>
          Add Layout into {displayName}
        </MenuItem>
      );
    }

    return items;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'default'
      }}
    >
      {children}
      <Menu
        open={menu !== null}
        onClose={close}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
        transitionDuration={0}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0e0e10',
              color: '#fff',
              border: '1px solid #27272a',
              borderRadius: '6px',
              minWidth: 180,
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              backgroundImage: 'none'
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
  color: '#d1d1d6',
  py: 1,
  px: 2,
  minHeight: 32,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
} as const;