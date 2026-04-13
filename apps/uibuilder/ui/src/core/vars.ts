/* ═══════════════════════════════════════════════════════════════
   vars.ts — Bare bones variable definition for inheritance engine.
   Focus: Grid layout, borders, and backgrounds only.
   ═══════════════════════════════════════════════════════════════ */

import { useEditor } from '@craftjs/core';

export type VarType = 'string' | 'number' | 'hex' | 'boolean' | 'option';

export interface VarDef {
  key: string;
  group: string;
  type: VarType;
  defaultValue: string | number;
  options?: string[];
  visibleWhen?: (vars: Record<string, any>) => boolean;
}

// ── Catalog ───────────────────────────────────────────────────────

export const VAR_CATALOG: VarDef[] = [
  { key: 'grid.columns',      group: 'layout', type: 'number',  defaultValue: 1 },
  { key: 'grid.rows',         group: 'layout', type: 'number',  defaultValue: 1 },
  { key: 'color.border',      group: 'color',  type: 'hex',     defaultValue: '#ffffff' },
  { key: 'color.background',  group: 'color',  type: 'hex',     defaultValue: '#121212' },
];

export const GROUP_ORDER = ['layout', 'color'];

export const getVarsForGroup = (group: string) => 
  VAR_CATALOG.filter(v => v.group === group);

// ── Inheritance Hook ───────────────────────────────

export function useAllInheritedVars(nodeId: string): Record<string, string | number> {
  const { query } = useEditor();

  const result: Record<string, any> = {};

  // 1. Fill with defaults
  VAR_CATALOG.forEach(v => { result[v.key] = v.defaultValue; });

  // 2. Walk up tree to collect overrides in root-to-leaf order
  const overridesStack: Record<string, any>[] = [];
  const walk = (id: string | null) => {
    if (!id) return;
    try {
      const node = query.node(id).get();
      overridesStack.unshift(node.data.props.customOverrides || {});
      walk(node.data.parent);
    } catch { /* end of tree */ }
  };

  walk(nodeId);
  overridesStack.forEach(overrides => {
    Object.assign(result, overrides);
  });
  return result;
}

export function useInheritedVar(key: string, nodeId: string) {
  const vars = useAllInheritedVars(nodeId);
  const { isLocal } = useEditor((state) => ({
    isLocal: !!state.nodes[nodeId]?.data.props?.customOverrides?.[key]
  }));

  return { value: vars[key], isLocal };
}

// ── Store logic ────────────────────────────────────────────────

export function useVarStore() {
  const { actions, query } = useEditor();

  const setOverride = (nodeId: string, key: string, value: any) => {
    actions.setProp(nodeId, (props) => {
      if (!props.customOverrides) props.customOverrides = {};
      props.customOverrides[key] = value;
    });
  };

  const removeOverride = (nodeId: string, key: string) => {
    actions.setProp(nodeId, (props) => {
      if (props.customOverrides) delete props.customOverrides[key];
    });
  };

  const hasOverride = (nodeId: string, key: string) => {
    try {
      const node = query.node(nodeId).get();
      return !!node.data.props.customOverrides?.[key];
    } catch { return false; }
  };

  // Minimal mock for ContextMenu compatibility
  const moveOverrideToParent = (nodeId: string, key: string) => {}; 
  const moveOverrideToRoot = (nodeId: string, key: string) => {};

  return { 
    setOverride, 
    removeOverride, 
    hasOverride, 
    moveOverrideToParent, 
    moveOverrideToRoot,
    overrides: {} 
  };
}

export const VarStoreProvider = ({ children }: any) => children;
