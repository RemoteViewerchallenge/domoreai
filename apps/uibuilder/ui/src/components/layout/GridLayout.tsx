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
  rules: {
    canDrag: () => false,
  }
};

/* ── GridLayout — The recursive layout component ── */

export const GridLayout = () => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();
  const vars = useAllInheritedVars(id);

  const cols = Math.max(1, Number(vars['grid.columns']) || 1);
  const rows = Math.max(1, Number(vars['grid.rows']) || 1);
  const totalCells = cols * rows;

  const borderColor = String(vars['color.border'] || '#ffffff');
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
        gap: '1px',
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
