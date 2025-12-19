// @Role: Senior TypeScript Developer
// @Task: Implement the "Code Mode" Operations Class
// @Context: This is the API the AI uses to manipulate the UI. It must be robust.

import { NebulaTree, NebulaNode, NebulaId, StyleTokens } from '../core/types.js';
import { nanoid } from 'nanoid';
import { produce } from 'immer'; // Use immer for immutable state updates

export class NebulaOps {
  private tree: NebulaTree;
  private onChange: (tree: NebulaTree) => void;

  constructor(initialTree: NebulaTree, onChange: (tree: NebulaTree) => void) {
    this.tree = initialTree;
    this.onChange = onChange;
  }

  // --- Core CRUD ---

  /**
   * Adds a new node to the tree.
   * AI Usage: nebula.addNode('container-1', { type: 'Button', props: { label: 'Click Me' } })
   */
  addNode(parentId: NebulaId, node: Partial<Omit<NebulaNode, 'id' | 'children'>>): NebulaId {
    const newId = `node_${nanoid(6)}`;

    this.tree = produce(this.tree, draft => {
      // Create Node
      draft.nodes[newId] = {
        id: newId,
        type: node.type || 'Box',
        props: node.props || {},
        style: node.style || {},
        layout: node.layout || { mode: 'flex', direction: 'column' },
        children: [],
        parentId,
        meta: { ...node.meta, source: 'ai-gen' }
      };

      // Link to Parent
      if (draft.nodes[parentId]) {
        draft.nodes[parentId].children.push(newId);
      }
    });

    this.onChange(this.tree);
    return newId;
  }

  /**
   * Updates properties or styles of a node.
   * AI Usage: nebula.updateNode(nodeId, { style: { background: 'bg-red-500' } })
   */
  updateNode(nodeId: NebulaId, update: Partial<NebulaNode>) {
    this.tree = produce(this.tree, draft => {
      if (draft.nodes[nodeId]) {
        // Deep merge logic should be applied here for props/style
        Object.assign(draft.nodes[nodeId], {
          ...update,
          props: { ...draft.nodes[nodeId].props, ...update.props },
          style: { ...draft.nodes[nodeId].style, ...update.style },
        });
      }
    });
    this.onChange(this.tree);
  }

  /**
   * Moves a node to a new index or new parent.
   * AI Usage: nebula.moveNode(cardId, containerId, 0)
   */
  moveNode(nodeId: NebulaId, targetParentId: NebulaId, index: number) {
    this.tree = produce(this.tree, draft => {
      const node = draft.nodes[nodeId];
      if (!node) return;

      // Remove from old parent
      const oldParent = draft.nodes[node.parentId!];
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== nodeId);
      }

      // Add to new parent
      const newParent = draft.nodes[targetParentId];
      if (newParent) {
        newParent.children.splice(index, 0, nodeId);
        node.parentId = targetParentId;
      }
    });
    this.onChange(this.tree);
  }

  /**
   * Deletes a node and its children.
   */
  deleteNode(nodeId: NebulaId) {
    this.tree = produce(this.tree, draft => {
        // Recursive deletion logic needed here
        const deleteRecursive = (id: NebulaId) => {
            const n = draft.nodes[id];
            if(!n) return;
            n.children.forEach(deleteRecursive);
            delete draft.nodes[id];
        };

        // Unlink from parent
        const parentId = draft.nodes[nodeId]?.parentId;
        if (parentId && draft.nodes[parentId]) {
            draft.nodes[parentId].children = draft.nodes[parentId].children.filter(id => id !== nodeId);
        }

        deleteRecursive(nodeId);
    });
    this.onChange(this.tree);
  }
}
