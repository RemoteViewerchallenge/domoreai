/* ═══════════════════════════════════════════════════════════════
   SpreadsheetRow.tsx — Variable editor optimized for Sidebar.
   2-column grid layout to pack info tightly.
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback } from 'react';
import { useVarStore, useInheritedVar, type VarDef } from '../../core/vars';

interface VarCellProps {
  def: VarDef;
  nodeId: string;
}

const VarCell = React.memo(({ def, nodeId }: VarCellProps) => {
  const { value, isLocal } = useInheritedVar(def.key, nodeId);
  const { setOverride, hasOverride } = useVarStore();
  const isOwned = hasOverride(nodeId, def.key);

  const handleChange = useCallback(
    (newVal: string) => {
      if (!isOwned) return;
      let parsed: string | number = newVal;
      if (def.type === 'number') {
        const n = Number(newVal);
        if (!isNaN(n)) parsed = n;
      }
      setOverride(nodeId, def.key, parsed);
    },
    [isOwned, setOverride, nodeId, def.key, def.type],
  );

  const strVal = String(value);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '6px 8px',
        border: '1px solid rgba(255,255,255,0.03)',
        background: isOwned ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderRadius: 4
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          {def.key.split('.').pop()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {def.type === 'hex' && (
          <label style={{ cursor: isOwned ? 'pointer' : 'default', width: 14, height: 14, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: strVal }}>
             <input
              type="color"
              value={strVal}
              onChange={(e) => isOwned && handleChange(e.target.value)}
              disabled={!isOwned}
              style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </label>
        )}
        
        <input
          type={def.type === 'number' ? 'number' : 'text'}
          value={strVal}
          onChange={(e) => isOwned && handleChange(e.target.value)}
          disabled={!isOwned}
          placeholder={String(def.defaultValue)}
          style={{
            background: isOwned ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: isOwned ? '1px solid rgba(255,255,255,0.1)' : 'none',
            outline: 'none',
            color: isLocal ? '#fff' : 'rgba(255,255,255,0.4)',
            fontFamily: 'monospace',
            fontSize: 11,
            flex: 1,
            padding: '2px 4px',
            borderRadius: 2
          }}
        />
      </div>
    </div>
  );
});

export const SpreadsheetRow = React.memo(({ group, defs, nodeId }: { group: string; defs: VarDef[]; nodeId: string }) => {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        padding: '2px 8px', 
        fontSize: 9, 
        fontWeight: 600, 
        color: 'rgba(255,255,255,0.5)', 
        textTransform: 'uppercase',
        marginBottom: 6
      }}>
        {group}
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 6,
        padding: '0 8px'
      }}>
        {defs.map((def) => (
          <VarCell key={def.key} def={def} nodeId={nodeId} />
        ))}
      </div>
    </div>
  );
});
