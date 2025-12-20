// @Role: Senior TypeScript Developer
// @Task: Implement the "Code Mode" Operations Class
// @Context: This is the API the AI uses to manipulate the UI. It must be robust.

import { NebulaTree, NebulaNode, NebulaId, StyleTokens } from '../core/types.js';
import { nanoid } from 'nanoid';
import { produce } from 'immer'; // Use immer for immutable state updates
import { JsxParser } from './JsxParser.js';

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
        bindings: node.bindings || [],
        actions: node.actions || [],
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
   * Sets a whole new tree.
   */
  setTree(newTree: NebulaTree) {
    this.tree = newTree;
    this.onChange(this.tree);
  }

  /**
   * Ingests a raw JSX string, explodes it into nodes, and attaches it to parentId.
   */
  ingest(parentId: NebulaId, rawJsx: string): NebulaId {
    console.log(`[NebulaOps] Ingesting JSX into ${parentId}`);
    
    // Extract JSX from code
    const jsx = JsxParser.extractJsx(rawJsx);
    
    // Parse into element tree
    const parsed = JsxParser.parse(jsx);
    
    if (!parsed) {
      console.warn('[NebulaOps] Failed to parse JSX');
      return this.addNode(parentId, {
        type: 'Box',
        props: { className: 'parse-error' },
        meta: { aiDescription: 'Failed to parse JSX', source: 'imported' }
      });
    }
    
    // Convert parsed tree to Nebula nodes
    return this.buildFromParsed(parsed, parentId);
  }

  /**
   * Recursively build Nebula nodes from parsed JSX tree
   */
  private buildFromParsed(element: any, parentId: NebulaId): NebulaId {
    // Map HTML tag to Nebula type
    const type = JsxParser.mapToNebulaType(element.tag);
    
    // Extract className for styling
    const className = element.props.className || element.props.class || '';
    
    // Create the node
    const nodeId = this.addNode(parentId, {
      type,
      props: {
        ...element.props,
        className
      },
      meta: {
        aiDescription: `Imported ${element.tag}`,
        source: 'imported'
      }
    });
    
    // Recursively add children
    for (const child of element.children) {
      if (typeof child === 'string') {
        // Text content - add as Text node
        if (child.trim()) {
          this.addNode(nodeId, {
            type: 'Text',
            props: { content: child.trim() }
          });
        }
      } else {
        // Nested element
        this.buildFromParsed(child, nodeId);
      }
    }
    
    return nodeId;
  }

  /**
   * Updates the global theme tokens.
   */
  setTheme(theme: { primary: string; radius: number; font: string }) {
    console.log('[NebulaOps] Setting theme:', theme);
    // This would typically update a global theme state or CSS variables
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--radius', `${theme.radius}rem`);
    document.documentElement.style.setProperty('--font-family', theme.font);
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

  /**
   * Ingests a whole tree fragment into the current tree.
   * Useful for "Paste & Explode" or "Agentic Ingest".
   */
  ingestTree(parentId: NebulaId, fragment: NebulaTree) {
    this.tree = produce(this.tree, draft => {
      // 1. Merge all nodes from fragment into current nodes list
      Object.entries(fragment.nodes).forEach(([id, node]) => {
        draft.nodes[id] = {
          ...node,
          parentId: id === fragment.rootId ? parentId : node.parentId
        };
      });

      // 2. Link fragment root to parent
      if (draft.nodes[parentId]) {
        draft.nodes[parentId].children.push(fragment.rootId);
      }

      // 3. Merge Imports & Exports (set union)
      if (fragment.imports) {
         if (!draft.imports) draft.imports = [];
         fragment.imports.forEach(imp => {
            if (!draft.imports.includes(imp)) draft.imports.push(imp);
         });
      }
      if (fragment.exports) {
        if (!draft.exports) draft.exports = [];
        fragment.exports.forEach(exp => {
           if (!draft.exports.includes(exp)) draft.exports.push(exp);
        });
      }
    });

    this.onChange(this.tree);
    return fragment.rootId;
  }
}
