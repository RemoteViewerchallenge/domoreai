import * as ts from 'typescript';
import { NebulaNode, NebulaId, StyleTokens, NebulaTree, DataBinding } from '../core/types.js';
import { nanoid } from 'nanoid';

export class AstTransformer {
  private nodes: Record<NebulaId, NebulaNode> = {};

  /**
   * Converts a generic JSX string into a Nebula Tree Fragment.
   * Example Input: <div className="p-4 bg-red-500"><Button>Hello</Button></div>
   */
  public parse(code: string): NebulaTree {
    this.nodes = {}; // Reset nodes

    // Wrap in fragment to ensure valid TSX if multiple root nodes
    const file = ts.createSourceFile(
      'temp.tsx',
      `<> ${code} </>`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    // Traverse from the SourceFile itself to be safe
    const rootNode = this.visit(file);

    if (!rootNode) {
        throw new Error("Failed to parse JSX: No root node found.");
    }

    return {
        rootId: rootNode.id,
        nodes: this.nodes,
        version: 1
    };
  }

  private visit(node: ts.Node): NebulaNode | null {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      return this.mapJsxElement(node);
    }

    // 1. HANDLE TEXT EXPRESSIONS: <span>{user.name}</span>
    if (ts.isJsxExpression(node)) {
       const expression = node.expression;
       if (expression) {
         const bindingPath = this.extractBindingPath(expression);
         if (bindingPath) {
            // Return a Text node with a binding attached
            const id = nanoid();
            const textNode: NebulaNode = {
                id,
                type: 'Text',
                props: { content: `{{${bindingPath}}}` }, // Visual placeholder
                style: {},
                children: [],
                bindings: [{ propName: 'content', sourcePath: bindingPath }]
            };
            this.nodes[id] = textNode;
            return textNode;
         }
       }
    }

    // Handle Static Text
    if (ts.isJsxText(node)) {
        const text = node.getText().trim();
        if(!text) return null;

        const id = nanoid();
        const textNode: NebulaNode = {
            id,
            type: 'Text',
            props: { content: text },
            style: {},
            children: []
        }
        this.nodes[id] = textNode;
        return textNode;
    }

    // Traverse children if it's a Fragment or other wrapper
    const childrenNodes: NebulaNode[] = [];
    node.forEachChild(child => {
        const result = this.visit(child);
        if (result) childrenNodes.push(result);
    });

    // If we parsed multiple nodes at root (or in a fragment/list), return a Container or the single child
    if (childrenNodes.length === 1) return childrenNodes[0];

    if (childrenNodes.length > 0) {
        // SourceFile/Fragment with multiple children -> Wrap in Box
        const id = nanoid();
        const containerNode: NebulaNode = {
            id,
            type: 'Box', // Default container
            style: {},
            children: childrenNodes.map(c => c.id),
            props: {}
        };
        this.nodes[id] = containerNode;
        return containerNode;
    }

    return null;
  }

  private mapJsxElement(node: ts.JsxElement | ts.JsxSelfClosingElement): NebulaNode {
    const tagName = ts.isJsxSelfClosingElement(node)
        ? node.tagName.getText()
        : node.openingElement.tagName.getText();

    const props: Record<string, any> = {};
    const style: StyleTokens = {};
    const bindings: DataBinding[] = []; // Store discovered bindings here

    // Extract Attributes
    const attributes = ts.isJsxSelfClosingElement(node)
        ? node.attributes
        : node.openingElement.attributes;

    attributes.forEachChild((attr) => {
        if (ts.isJsxAttribute(attr)) {
            const name = attr.name.getText();
            let value: any = true;

            // 3. HANDLE ATTRIBUTE EXPRESSIONS: <img src={product.image} />
            if (attr.initializer && ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                const bindingPath = this.extractBindingPath(attr.initializer.expression);
                if (bindingPath) {
                    bindings.push({ propName: name, sourcePath: bindingPath });
                    return; // Skip adding to static props
                }
            }

            if (attr.initializer) {
                 if (ts.isStringLiteral(attr.initializer)) {
                    value = attr.initializer.text;
                } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                     // Fallback for non-binding expressions
                     value = attr.initializer.expression.getText();
                }
            }
            // Parsing Tailwind Classes into StyleTokens
            if (name === 'className' && typeof value === 'string') {
                this.parseTailwindToTokens(value, style);
            } else {
                props[name] = value;
            }
        }
    });

    const childrenNodes: NebulaNode[] = [];
    if (ts.isJsxElement(node)) {
        node.children.forEach(child => {
             const res = this.visit(child);
             if (res) childrenNodes.push(res);
        });
    }

    const id = nanoid();
    const nebulaNode: NebulaNode = {
        id,
        type: tagName, // Maps to "Card", "Button", etc.
        props,
        bindings, // <--- Attach harvested bindings
        style,
        children: childrenNodes.map(c => c.id),
        meta: { source: 'imported' }
    };

    this.nodes[id] = nebulaNode;
    return nebulaNode;
  }

  private parseTailwindToTokens(className: string, style: StyleTokens) {
      // Heuristic mapping: "p-4" -> style.padding = "p-4"
      const classes = className.split(/\s+/);
      classes.forEach(c => {
          if (c.startsWith('p-')) style.padding = c;
          if (c.startsWith('gap-')) style.gap = c;
          if (c.startsWith('bg-')) style.background = c;
          if (c.startsWith('text-')) style.color = c;
          if (c.startsWith('rounded-')) style.radius = c as any;
          if (c.startsWith('shadow-')) style.shadow = c as any;
          if (c.startsWith('w-')) style.width = c;
          if (c.startsWith('h-')) style.height = c;
          if (c.startsWith('border')) style.border = c;
      });
  }

  /**
   * Recursive helper to turn AST "user.profile.name" into string "user.profile.name"
   */
  private extractBindingPath(node: ts.Expression): string | null {
      // Handle simple identifier: "{name}"
      if (ts.isIdentifier(node)) {
          return node.text;
      }
      // Handle property access: "{user.name}" or "{props.data.title}"
      if (ts.isPropertyAccessExpression(node)) {
          const left = this.extractBindingPath(node.expression);
          const right = node.name.text;
          return left ? `${left}.${right}` : right;
      }
      return null; // Too complex (function calls, math, etc.)
  }
}
