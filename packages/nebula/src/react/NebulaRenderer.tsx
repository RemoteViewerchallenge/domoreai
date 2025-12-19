import React from 'react';
import { NebulaTree, NebulaNode, LayoutMode, Direction, Alignment } from '../core/types.js';
import { cn } from '../lib/utils.js';

// 1. The Component Registry (Map JSON 'type' to React Component)
// Ideally injected via props, but creating a default map here.
const Registry: Record<string, React.FC<any>> = {
  Box: ({ className, children, ...props }) => <div className={className} {...props}>{children}</div>,
  Text: ({ content, className, type }) => {
      const Tag = (type === 'h1' ? 'h1' : type === 'h2' ? 'h2' : 'p') as keyof JSX.IntrinsicElements;
      return <Tag className={className}>{content}</Tag>
  },
  Button: ({ children, className, variant, ...props }) => {
      // Basic button implementation to satisfy simulation.
      // In a real app, this should be injected or use a proper component library.
      return <button className={`px-4 py-2 rounded font-medium transition-colors ${variant === 'outline' ? 'border bg-transparent hover:bg-neutral-100' : 'bg-blue-600 text-white hover:bg-blue-700'} ${className}`} {...props}>{children}</button>
  }
};

interface RendererProps {
  tree: NebulaTree;
  nodeId?: string; // Entry point, defaults to root
  componentMap?: Record<string, React.FC<any>>;
}

export const NebulaRenderer: React.FC<RendererProps> = ({
  tree,
  nodeId = tree.rootId,
  componentMap = Registry
}) => {
  const node = tree.nodes[nodeId];
  if (!node) return null;

  const Component = componentMap[node.type] || componentMap['Box'];

  // Resolve Tailwind Classes from Tokens
  const layoutClasses = resolveLayout(node.layout);
  const styleClasses = resolveStyles(node.style);
  const combinedClasses = cn(layoutClasses, styleClasses, node.props.className);

  return (
    <Component {...node.props} className={combinedClasses} data-nebula-id={node.id}>
      {node.children.length > 0
        ? node.children.map(childId => (
            <NebulaRenderer
              key={childId}
              tree={tree}
              nodeId={childId}
              componentMap={componentMap}
            />
          ))
        : node.props.children
      }
    </Component>
  );
};

// Helper: Convert Layout object to Tailwind strings
function resolveLayout(layout: NebulaNode['layout']) {
    if (!layout) return '';
    const classes = [];

    // Mode
    if (layout.mode === 'flex') {
        classes.push('flex');

        // Direction
        if (layout.direction === 'column') classes.push('flex-col');
        else if (layout.direction === 'row') classes.push('flex-row');
        else if (layout.direction === 'column-reverse') classes.push('flex-col-reverse');
        else if (layout.direction === 'row-reverse') classes.push('flex-row-reverse');

        // Justify
        classes.push(mapAlignment(layout.justify, 'justify'));

        // Align
        classes.push(mapAlignment(layout.align, 'items'));

        // Wrap
        if (layout.wrap) classes.push('flex-wrap');

    } else if (layout.mode === 'grid') {
        classes.push('grid');
        if (layout.columns) classes.push(`grid-cols-${layout.columns}`);

        // Justify/Align in grid often maps differently but basic items/justify applies
        classes.push(mapAlignment(layout.justify, 'justify'));
        classes.push(mapAlignment(layout.align, 'items'));
    } else if (layout.mode === 'absolute') {
        classes.push('absolute');
    }

    // Gap (Common to flex and grid)
    if (layout.gap) classes.push(layout.gap);

    return classes.join(' ');
}

function mapAlignment(align: Alignment | undefined, prefix: 'justify' | 'items'): string {
    if (!align) return '';

    // Tailwind mapping
    // justify: start, center, end, between, around, evenly
    // items: start, center, end, stretch, baseline

    switch (align) {
        case 'start': return `${prefix}-start`;
        case 'center': return `${prefix}-center`;
        case 'end': return `${prefix}-end`;
        case 'between': return prefix === 'justify' ? 'justify-between' : ''; // items-between invalid
        case 'around': return prefix === 'justify' ? 'justify-around' : '';
        case 'stretch': return prefix === 'items' ? 'items-stretch' : 'justify-stretch'; // justify-stretch exists
        default: return '';
    }
}

function resolveStyles(style: NebulaNode['style']) {
    // Map tokens to classes
    // Safely filter to only include string values (ignoring responsive objects for now)
    return Object.values(style || {})
        .filter((val): val is string => typeof val === 'string')
        .join(' ');
}
