/* ═══════════════════════════════════════════════════════════════
   Text.tsx — Two-sided card.
   Front: contenteditable div using inherited text.* variables.
   Back: spreadsheet with TEXT and COLOR groups only.
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback, useRef } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import {
  useAllInheritedVars,
  getVarsForGroup,
} from '../../core/vars';
import { SpreadsheetRow } from '../layout/SpreadsheetRow';

// ── Props ───────────────────────────────────────────────────────

interface TextProps {
  text?: string;
  isFlipped?: boolean;
}

// ── Component ───────────────────────────────────────────────────

export const Text = ({ text = 'New Text', isFlipped = false }: TextProps) => {
  const {
    connectors: { connect, drag },
    actions: nodeActions,
    id,
  } = useNode();
  const { actions } = useEditor();
  const vars = useAllInheritedVars(id);
  const contentRef = useRef(text);

  const handleChange = useCallback(
    (e: { target: { value: string } }) => {
      contentRef.current = e.target.value;
      nodeActions.setProp((props: Record<string, unknown>) => {
        props.text = e.target.value;
      }, 500);
    },
    [nodeActions],
  );

  // ── back side: spreadsheet (TEXT + COLOR only) ───────────────

  if (isFlipped) {
    const textDefs = getVarsForGroup('text');
    const colorDefs = getVarsForGroup('color');

    return (
      <div
        ref={(r) => { if (r) connect(drag(r)); }}
        data-craft-node-id={id}
        onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
        style={{
          width: '100%',
          minHeight: 48,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontFamily: 'var(--text-font)',
          overflow: 'auto',
          boxSizing: 'border-box',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
        }}
      >
        <SpreadsheetRow group="text" defs={textDefs} nodeId={id} />
        <SpreadsheetRow group="color" defs={colorDefs} nodeId={id} />
      </div>
    );
  }

  // ── front side: contenteditable ──────────────────────────────

  return (
    <div
      ref={(r) => { if (r) connect(drag(r)); }}
      data-craft-node-id={id}
      onClick={(e) => { e.stopPropagation(); actions.selectNode(id); }}
      style={{ width: '100%' }}
    >
      <ContentEditable
        html={text}
        disabled={false}
        onChange={handleChange}
        style={{
          fontFamily: String(vars['text.font'] || 'Inter, system-ui, sans-serif'),
          fontSize: String(vars['text.size.base'] || '13px'),
          fontWeight: String(vars['text.weight'] || '400'),
          lineHeight: String(vars['text.lineHeight'] || '1.5'),
          letterSpacing: String(vars['text.letterSpacing'] || '0px'),
          textAlign: String(vars['text.align'] || 'left') as React.CSSProperties['textAlign'],
          color: String(vars['color.text'] || '#e4e4e7'),
          outline: 'none',
          width: '100%',
          cursor: String(vars['cursor'] || 'text'),
          opacity: Number(vars['opacity'] || 1),
          transition: `all ${vars['transition.duration'] || '0ms'}`,
        }}
      />
    </div>
  );
};

Text.craft = {
  displayName: 'Text',
  props: {
    text: 'New Text',
    isFlipped: false,
  },
  rules: {
    canDrag: () => true,
  },
};