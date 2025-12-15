import React from 'react';
import { useEditor } from '@craftjs/core';

export const SettingsPanel = () => {
  const { actions, selected } = useEditor((state, query) => {
    const [currentNodeId] = state.events.selected;
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name: state.nodes[currentNodeId].data.name,
        settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
        isDeletable: query.node(currentNodeId).isDeletable(),
      };
    }

    return {
      selected,
    };
  });

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-4 h-full overflow-y-auto">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-2 border-b border-zinc-800 mb-4">
        Settings
      </h3>

      {selected ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-100">{selected.name}</span>
            {selected.isDeletable && (
              <button
                className="px-2 py-1 text-xs bg-red-900/30 text-red-400 border border-red-900/50 rounded hover:bg-red-900/50 transition-colors"
                onClick={() => {
                  actions.delete(selected.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
          
          {selected.settings && React.createElement(selected.settings)}
          
          {!selected.settings && (
            <div className="text-xs text-zinc-500 italic">
               No settings available for this component.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-zinc-600 text-xs text-center border border-dashed border-zinc-800 rounded">
          <span>Select a component<br/>to edit settings</span>
        </div>
      )}
    </div>
  );
};
