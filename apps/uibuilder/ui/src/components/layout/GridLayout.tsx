import React, { useState } from 'react';
import { useNode, useEditor, Element } from '@craftjs/core';
import { useAllInheritedVars } from '../../core/vars';
import { usePopout } from '../../hooks/usePopout';

/* ── GridCell — A single flexible cell in a GridLayout ── */

export const GridCell = ({ children }: any) => {
  const { connectors: { connect }, id } = useNode();
  const vars = useAllInheritedVars(id);
  const [hovered, setHovered] = useState(false);
  
  // Prompt 4: Popout functionality
  const { popOut } = usePopout(id);

  const bgColor = String(vars['color.background'] || 'transparent');
  const borderColor = String(vars['color.border'] || '#444444');

  return (
    <div
      ref={(r) => { if (r) connect(r); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-craft-node-id={id}
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        position: 'relative',
        boxSizing: 'border-box',
        border: `1px solid ${borderColor}`,
        minHeight: 40,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Prompt 4: Hover-visible popout button */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); popOut(); }}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            width: 16,
            height: 16,
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          ⤢
        </button>
      )}
      {children}
    </div>
  );
};

GridCell.craft = {
  displayName: 'Cell',
  isCanvas: true,
};

/* ── GridLayout — The recursive layout component ── */

export const GridLayout = ({ 
  cols = 2, 
  rows = 2, 
  rowConfigs = null, 
  snapGrid = 0,
  hoverExpand = false,
  expandRatio = 2 
}: any) => {
  const { connectors: { connect, drag }, id } = useNode();
  const { actions } = useEditor();
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const borderColor = 'rgba(255,255,255,0.1)';

  // Hover Expand Logic
  let gridColumns = `repeat(${cols}, 1fr)`;
  let gridRows = `repeat(${rows}, 1fr)`;

  if (hoverExpand && hoveredCell !== null) {
    const activeCol = hoveredCell % cols;
    const activeRow = Math.floor(hoveredCell / cols);

    const colTracks = Array.from({ length: cols }).map((_, i) => 
      i === activeCol ? `${expandRatio}fr` : '1fr'
    );
    const rowTracks = Array.from({ length: rows }).map((_, i) => 
      i === activeRow ? `${expandRatio}fr` : '1fr'
    );

    gridColumns = colTracks.join(' ');
    gridRows = rowTracks.join(' ');
  }

  // Visual Snap Grid Background
  const snapStyles: React.CSSProperties = snapGrid > 0 ? {
    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
    backgroundSize: `${snapGrid}px ${snapGrid}px`,
    backgroundPosition: 'center'
  } : {};

  // Rendering mode selection
  const isPerLayout = Array.isArray(rowConfigs) && rowConfigs.length > 0;

  if (isPerLayout) {
    return (
      <div
        ref={(r) => { if (r) connect(drag(r)); }}
        data-craft-node-id={id}
        onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent',
          gap: '2px',
          border: `1px solid ${borderColor}`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 80,
          ...snapStyles
        }}
      >
        {rowConfigs.map((rowCols: number, rowIndex: number) => (
          <div 
            key={rowIndex} 
            style={{ 
              flex: 1, 
              display: 'flex', 
              gap: '2px',
              minHeight: 20 
            }}
          >
            {Array.from({ length: rowCols }).map((_, colIndex) => (
              <div key={colIndex} style={{ flex: 1 }}>
                <Element
                  id={`cell-r${rowIndex}-c${colIndex}`}
                  is={GridCell}
                  canvas
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Standard Grid Mode
  const totalCells = cols * rows;
  return (
    <div
      ref={(r) => { if (r) connect(drag(r)); }}
      data-craft-node-id={id}
      onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
      onMouseLeave={() => setHoveredCell(null)}
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gridTemplateRows: gridRows,
        background: 'transparent',
        gap: '2px',
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 80,
        transition: 'grid-template-columns 0.15s ease, grid-template-rows 0.15s ease',
        ...snapStyles
      }}
    >
      {Array.from({ length: totalCells }).map((_, i) => (
        <div key={i} onMouseEnter={() => setHoveredCell(i)} style={{ width: '100%', height: '100%' }}>
          <Element
            id={`cell-${i}`}
            is={GridCell}
            canvas
          />
        </div>
      ))}
    </div>
  );
};

GridLayout.craft = {
  displayName: 'GridLayout',
  props: {
    cols: 2,
    rows: 2,
    rowConfigs: null,
    snapGrid: 0,
    hoverExpand: false,
    expandRatio: 2,
  },
};
