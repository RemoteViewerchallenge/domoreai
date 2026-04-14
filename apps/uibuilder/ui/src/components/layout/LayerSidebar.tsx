import React, { useState, useEffect } from 'react';
import { useEditor } from '@craftjs/core';
import {
  GROUP_ORDER,
  getVarsForGroup,
} from '../../core/vars';
import { SpreadsheetRow } from './SpreadsheetRow';

const TreeItem = ({ id, depth = 0, onEdit }: { id: string; depth: number, onEdit: (id: string) => void }) => {
  const { node } = useEditor((state, query) => ({
    node: query.node(id).get()
  }));

  // Skip rendering 'Cell' nodes in the layers tree to reduce clutter,
  // but they are still editable when selected on canvas.
  if (node.data.displayName === 'Cell') {
    const children = node.data.nodes || [];
    return (
      <>
        {children.map(childId => (
          <TreeItem key={childId} id={childId} depth={depth} onEdit={onEdit} />
        ))}
      </>
    );
  }

  const children = node.data.nodes || [];

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        style={{
          padding: '4px 8px',
          fontSize: 11,
          color: '#a1a1aa',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          height: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#fff' }}>{node.data.displayName}</span>
          <span style={{ fontSize: 9, opacity: 0.3 }}>#{id.slice(-3)}</span>
        </div>
        
        <button
          onClick={() => onEdit(id)}
          style={{
            background: '#3b82f6',
            border: 'none',
            color: '#fff',
            fontSize: 9,
            padding: '2px 8px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          EDIT
        </button>
      </div>
      {children.map(childId => (
        <TreeItem key={childId} id={childId} depth={depth + 1} onEdit={onEdit} />
      ))}
    </div>
  );
};

export const LayerSidebar = ({ onClose }: { onClose: () => void }) => {
  const [view, setView] = useState<'layers' | 'edit'>('layers');
  const [editNodeId, setEditNodeId] = useState<string | null>(null);

  // Sync with editor selection
  const { selectedId } = useEditor((state) => {
    const [id] = state.events.selected;
    return { selectedId: id };
  });

  useEffect(() => {
    if (selectedId) {
      setEditNodeId(selectedId);
      setView('edit');
    }
  }, [selectedId]);

  const handleEdit = (id: string) => {
    setEditNodeId(id);
    setView('edit');
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0c0c0e',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #27272a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
          {view === 'layers' ? 'LAYERS' : 'VARIABLE EDITOR'}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {view === 'edit' && (
            <div onClick={() => setView('layers')} style={{ cursor: 'pointer', fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>BACK</div>
          )}
          <div onClick={onClose} style={{ cursor: 'pointer', fontSize: 11, opacity: 0.5 }}>CLOSE</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'layers' ? (
          <div style={{ padding: '8px' }}>
            <TreeItem id="ROOT" depth={0} onEdit={handleEdit} />
          </div>
        ) : (
          <div style={{ padding: '16px 0' }}>
             {editNodeId && (
               <>
                <div style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 16, fontSize: 10, opacity: 0.5, textAlign: 'center' }}>
                  Editing Node: {editNodeId}
                </div>
                {GROUP_ORDER.map((group) => {
                  const defs = getVarsForGroup(group);
                  if (defs.length === 0) return null;
                  return (
                    <SpreadsheetRow
                      key={group}
                      group={group}
                      defs={defs}
                      nodeId={editNodeId}
                    />
                  );
                })}
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
