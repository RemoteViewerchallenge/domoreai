import { NebulaTree, NebulaNode, StyleTokens } from '../core/types.js';

export class CodeGenerator {

  generate(tree: NebulaTree): string {
    const root = tree.nodes[tree.rootId];
    if (!root) return '// Empty Tree';

    const jsx = this.renderNode(root, tree);

    const imports = (tree.imports && tree.imports.length > 0)
      ? tree.imports.join('\n')
      : `import React from 'react';\nimport { Button, Card, Input, Label, Slider } from '@/components/ui';`;

    return `
${imports}

export default function GeneratedPage() {
  return (
    ${jsx}
  );
}
    `.trim();
  }

  private renderNode(node: NebulaNode, tree: NebulaTree): string {
    const ComponentName = node.type === 'Container' ? 'div' : node.type; // Map specific generic types if needed

    // Resolve props and styles
    const className = this.resolveClassNames(node.style);

    // Convert props object to string attributes
    const propStrings: string[] = [];
    if (className) propStrings.push(`className="${className}"`);

    // Handle standard props
    Object.entries(node.props).forEach(([key, value]) => {
        if (key === 'children') return; // Handled separately
        if (typeof value === 'string') {
            propStrings.push(`${key}="${value}"`);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
             propStrings.push(`${key}={${value}}`);
        } else {
             // Complex objects?
             propStrings.push(`${key}={${JSON.stringify(value)}}`);
        }
    });

    const propsStr = propStrings.length > 0 ? ' ' + propStrings.join(' ') : '';

    // Check for children
    const hasRecursiveChildren = node.children && node.children.length > 0;

    if (!hasRecursiveChildren && !node.props.children) {
        // Self closing
        return `<${ComponentName}${propsStr} />`;
    }

    let childrenJSX = '';
    if (hasRecursiveChildren) {
        childrenJSX = node.children
        .map(childId => this.renderNode(tree.nodes[childId], tree))
        .join('\n');
    } else if (node.props.children) {
        childrenJSX = typeof node.props.children === 'string' ? node.props.children : '{...}';
    }

    return `
    <${ComponentName}${propsStr}>
      ${childrenJSX}
    </${ComponentName}>`;
  }

  private resolveClassNames(style: StyleTokens): string {
      // Reuse logic from Renderer or a shared util
      return [
        style.padding,
        style.gap,
        style.radius,
        style.shadow,
        style.background,
        style.color,
        style.border,
        style.width,
        style.height,
      ].filter(Boolean).join(' ');
  }
}
