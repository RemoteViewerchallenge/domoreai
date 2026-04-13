import React from 'react';
import { useNode, useEditor, Element } from '@craftjs/core';
import { useAllInheritedVars } from '../../core/vars';

/* ── GridCell — Internal drop zone for GridLayout cells ── */

export const GridCell = ({ children, borderColor, bgColor }: any) => {
  const { connectors: { connect }, id } = useNode();
  return (
    <div
      ref={(r) => { if (r) connect(r); }}
      data-craft-node-id={id}
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        position: 'relative',
        boxSizing: 'border-box',
        border: `0.5px solid ${borderColor}`,
        minHeight: 20,
      }}
    >
      {children}
    </div>
  );
};

GridCell.craft = {
  displayName: 'Cell',
  isCanvas: true,
  rules: {
    canDrag: () => false,
  }
};

/* ── GridLayout — The recursive layout component ── */

export const GridLayout = () => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();
  const vars = useAllInheritedVars(id);

  // Defaults updated to 2x2 for better visibility
  const cols = Math.max(1, typeof vars['grid.columns'] === 'number' ? vars['grid.columns'] : 2);
  const rows = Math.max(1, typeof vars['grid.rows'] === 'number' ? vars['grid.rows'] : 2);
  const totalCells = cols * rows;

  // Border fallback updated to #444444 for dark backgrounds
  const borderColor = String(vars['color.border'] || '#444444');
  const bgColor = String(vars['color.background'] || '#121212');

  return (
    <div
      ref={(r) => { if (r) connect(drag(r)); }}
      data-craft-node-id={id}
      onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        background: borderColor,
        // Gap updated to 2px
        gap: '2px',
        padding: '0px',
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 40,
      }}
    >
      {Array.from({ length: totalCells }).map((_, i) => (
        <Element
          key={i}
          id={`cell-${i}`}
          is={GridCell}
          canvas
          borderColor={borderColor}
          bgColor={bgColor}
        />
      ))}
    </div>
  );
};

GridLayout.craft = {
  displayName: 'GridLayout',
};
