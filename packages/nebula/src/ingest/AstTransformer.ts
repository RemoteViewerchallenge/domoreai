import * as ts from 'typescript';
import { NebulaNode, NebulaId, StyleTokens, NebulaTree } from '../core/types.js';
import { nanoid } from 'nanoid';

export class AstTransformer {
  private nodes: Record<NebulaId, NebulaNode> = {};

  /**
   * Converts a generic JSX string or full file into a Nebula Tree Fragment.
   */
  /**
   * Converts a generic JSX string or full file into a Nebula Tree Fragment.
   */
  public parse(code: string): NebulaTree {
    this.nodes = {}; // Reset nodes

    const isSnippet = !code.includes('import ') && !code.includes('export ');
    const source = isSnippet ? `<>${code}</>` : code;

    const file = ts.createSourceFile(
      'temp.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    let targetJsx: ts.Node | null = null;

    // 1. Try to find the default export
    const findDefaultExport = (n: ts.Node): ts.Node | null => {
        if (ts.isExportAssignment(n)) return n.expression;
        if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.modifiers) {
            const hasExport = n.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
            const hasDefault = n.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
            if (hasExport && hasDefault) return n;
        }
        return ts.forEachChild(n, findDefaultExport) || null;
    };

    const defaultExport = findDefaultExport(file);

    // 2. If we found a default export, search for JSX inside it
    if (defaultExport) {
        const findInnerJsx = (n: ts.Node): ts.Node | null => {
            if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return n;
            return ts.forEachChild(n, findInnerJsx) || null;
        };
        targetJsx = findInnerJsx(defaultExport);
    }

    // 3. Fallback: Take the first JSX root found anywhere in the file
    if (!targetJsx) {
        const findFirstJsx = (n: ts.Node): ts.Node | null => {
            if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return n;
            return ts.forEachChild(n, findFirstJsx) || null;
        };
        targetJsx = findFirstJsx(file);
    }

    if (!targetJsx) {
        throw new Error("Failed to parse JSX: No JSX elements found in the provided code.");
    }

    const rootNode = this.visit(targetJsx);

    if (!rootNode) {
        throw new Error("Failed to parse JSX: Root node processing failed.");
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

    // Handle Text
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

    // Handle Expressions (e.g. {children}, {variable}, or mapping)
    if (ts.isJsxExpression(node)) {
        let expressionText = node.expression?.getText() || '...';
        // Truncate long logic blocks for a cleaner UI
        if (expressionText.length > 40) {
            expressionText = expressionText.substring(0, 37) + '...';
        }
        
        const id = nanoid();
        const exprNode: NebulaNode = {
            id,
            type: 'Text',
            props: { content: `{${expressionText}}`, className: 'text-[10px] text-blue-400 font-mono bg-blue-500/5 px-1 rounded' },
            style: {},
            children: []
        }
        this.nodes[id] = exprNode;
        return exprNode;
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
        const id = nanoid();
        const containerNode: NebulaNode = {
            id,
            type: 'Box', // Default container
            style: {},
            layout: { mode: 'flex', direction: 'column' },
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
    const layout: any = {};

    // Extract Attributes
    const attributes = ts.isJsxSelfClosingElement(node)
        ? node.attributes
        : node.openingElement.attributes;

    attributes.forEachChild((attr) => {
        if (ts.isJsxAttribute(attr)) {
            const name = attr.name.getText();
            let value: any = true;
            if (attr.initializer) {
                 if (ts.isStringLiteral(attr.initializer)) {
                    value = attr.initializer.text;
                } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                     value = attr.initializer.expression.getText();
                }
            }
            // Parsing Tailwind Classes into StyleTokens and Layout
            if (name === 'className' && typeof value === 'string') {
                this.parseTailwindToTokens(value, style, layout);
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
        style,
        layout,
        children: childrenNodes.map(c => c.id),
        meta: { source: 'imported' }
    };

    this.nodes[id] = nebulaNode;
    return nebulaNode;
  }

  private parseTailwindToTokens(className: string, style: StyleTokens, layout: any) {
      const classes = className.split(/\s+/);
      classes.forEach(c => {
          // 1. STYLE TOKENS
          if (c.startsWith('p-')) style.padding = c;
          if (c.startsWith('px-')) style.padding = (style.padding || '') + ' ' + c;
          if (c.startsWith('py-')) style.padding = (style.padding || '') + ' ' + c;
          if (c.startsWith('bg-')) style.background = c;
          if (c.startsWith('text-')) style.color = c;
          if (c.startsWith('rounded-')) style.radius = c as any;
          if (c.startsWith('shadow-')) style.shadow = c as any;
          if (c.startsWith('w-')) style.width = c;
          if (c.startsWith('h-')) style.height = c;
          if (c.startsWith('border')) style.border = c;

          // 2. LAYOUT ENGINE
          if (c === 'flex') layout.mode = 'flex';
          if (c === 'grid') layout.mode = 'grid';
          if (c === 'flex-col') layout.direction = 'column';
          if (c === 'flex-row') layout.direction = 'row';
          
          if (c === 'items-center') layout.align = 'center';
          if (c === 'items-start') layout.align = 'start';
          if (c === 'items-end') layout.align = 'end';
          if (c === 'items-stretch') layout.align = 'stretch';

          if (c === 'justify-center') layout.justify = 'center';
          if (c === 'justify-between') layout.justify = 'between';
          if (c === 'justify-around') layout.justify = 'around';
          if (c === 'justify-start') layout.justify = 'start';
          if (c === 'justify-end') layout.justify = 'end';

          if (c.startsWith('gap-')) layout.gap = c;
          if (c.startsWith('grid-cols-')) layout.columns = parseInt(c.replace('grid-cols-', ''));
      });
  }
}
