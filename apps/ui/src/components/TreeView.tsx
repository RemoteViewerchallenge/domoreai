import React, { useEffect } from 'react';
import Sortable from 'sortablejs';

interface TreeViewProps {
  tree: any; // Define a proper type for the tree structure
  onMove: (source: string, destination: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({ tree, onMove }) => {
  useEffect(() => {
    const draggable = document.querySelectorAll('[data-nested-draggable]');
    draggable.forEach(el => {
      new Sortable(el as HTMLElement, {
        group: 'nested',
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        ghostClass: 'dragged',
        onEnd: evt => {
          const { item, to } = evt;
          const source = item.getAttribute('data-path');
          const destination = to.getAttribute('data-path');
          if (source && destination) {
            onMove(source, destination);
          }
        },
      });
    });
  }, [tree, onMove]);

  const renderTree = (nodes: any[], path: string) => (
    <div className="tree-view-space" data-nested-draggable="true" data-path={path}>
      {nodes.map(node => (
        <div
          key={node.name}
          className="accordion-item"
          data-tree-view-item={JSON.stringify({ value: node.name, isDir: node.children !== undefined })}
          data-path={`${path}/${node.name}`}
        >
          <div className="accordion-heading">
            <button className="accordion-toggle">
              <span className="icon-[tabler--plus]" />
            </button>
            <div className="tree-view-selected:bg-base-300/40 grow cursor-pointer">
              <div className="flex items-center gap-x-3">
                <span className={node.children ? 'icon-[tabler--folder]' : 'icon-[tabler--file]'} />
                <div className="grow">
                  <span>{node.name}</span>
                </div>
              </div>
            </div>
          </div>
          {node.children && (
            <div className="accordion-content">
              {renderTree(node.children, `${path}/${node.name}`)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div id="tree-view" data-tree-view="">
      {renderTree(tree, '')}
    </div>
  );
};
