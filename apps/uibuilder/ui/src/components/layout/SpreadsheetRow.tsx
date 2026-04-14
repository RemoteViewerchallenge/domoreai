/* ═══════════════════════════════════════════════════════════════
   SpreadsheetRow.tsx — Variable editor optimized for Sidebar.
   Robust inputs with local state to prevent jumping during typing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback, useState, useEffect } from 'react';
import { useEditor } from '@craftjs/core';
import { useVarStore, useInheritedVar, type VarDef } from '../../core/vars';

interface VarCellProps {
  def: VarDef;
  nodeId: string;
}

const VarCell = React.memo(({ def, nodeId }: VarCellProps) => {
  const { value } = useInheritedVar(def.key, nodeId);
  const { setOverride, removeOverride } = useVarStore();
  const { isOwned } = useEditor((state) => ({
    isOwned: !!state.nodes[nodeId]?.data?.props?.customOverrides?.[def.key]
  }));

  // Local state for the input to allow free typing before committing
  const [localVal, setLocalVal] = useState(String(value));

  // Keep local state in sync when external value changes
  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commit = useCallback((raw: string) => {
    if (!isOwned) return;
    if (def.type === 'number') {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 1) {
        setOverride(nodeId, def.key, n);
      } else {
        // Revert to current value if invalid
        setLocalVal(String(value));
      }
    } else {
      setOverride(nodeId, def.key, raw);
    }
  }, [isOwned, def.type, def.key, nodeId, value, setOverride]);

  const toggleOverride = useCallback(() => {
    if (isOwned) {
      removeOverride(nodeId, def.key);
    } else {
      setOverride(nodeId, def.key, value);
    }
  }, [isOwned, nodeId, def.key, value, setOverride, removeOverride]);

  const strVal = String(value);

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      gap: 4,
      padding: '8px',
      border: `1px solid ${isOwned ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.05)'}`,
      background: isOwned ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.01)',
      borderRadius: 4, 
      minWidth: 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ 
          fontSize: 9, 
          color: isOwned ? '#fff' : 'rgba(255,255,255,0.4)', 
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {def.key.split('.').pop()}
        </span>
        <button onClick={toggleOverride} style={{
          width: 14, height: 14, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'none', 
          border: 'none',
          color: isOwned ? '#ef4444' : '#3b82f6',
          cursor: 'pointer', 
          fontSize: 13, 
          fontFamily: 'monospace', 
          padding: 0, 
          lineHeight: 1
        }}>
          {isOwned ? '×' : '+'}
        </button>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
        {def.type === 'hex' && (
          <label style={{ 
            width: 12, height: 12, 
            borderRadius: 2, 
            border: '1px solid rgba(255,255,255,0.15)', 
            flexShrink: 0, 
            background: strVal, 
            cursor: isOwned ? 'pointer' : 'default' 
          }}>
            <input 
              type="color" 
              value={strVal} 
              disabled={!isOwned}
              onChange={(e) => { setLocalVal(e.target.value); commit(e.target.value); }}
              style={{ opacity: 0, width: '100%', height: '100%', padding: 0, border: 'none' }} 
            />
          </label>
        )}
        
        <input
          type={def.type === 'number' ? 'number' : 'text'}
          value={localVal}
          disabled={!isOwned}
          min={def.type === 'number' ? 1 : undefined}
          step={def.type === 'number' ? 1 : undefined}
          onChange={(e) => { 
            setLocalVal(e.target.value); 
            if (def.type !== 'number') commit(e.target.value); 
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { 
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); 
          }}
          style={{
            background: 'transparent', 
            border: 'none', 
            outline: 'none',
            color: isOwned ? '#fff' : 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace', 
            fontSize: 11,
            width: '100%', 
            minWidth: 0, 
            boxSizing: 'border-box',
            padding: '1px 2px'
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
