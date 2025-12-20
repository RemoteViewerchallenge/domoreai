import React from 'react';
import type { NebulaTree, NebulaNode, Alignment } from '@repo/nebula';
import { cn } from '../../lib/utils'; // Adapting to local UI utils

// 1. The Component Registry (Map JSON 'type' to React Component)
const Registry: Record<string, React.FC<any>> = {
  Box: ({ className, children, ...props }) => <div className={className} {...props}>{children}</div>,
  Text: ({ content, className, type }) => {
      const Tag = (type === 'h1' ? 'h1' : type === 'h2' ? 'h2' : 'p') as keyof JSX.IntrinsicElements;
      return <Tag className={className}>{content}</Tag>
  },
  Button: ({ children, className, variant, ...props }) => {
      const base = "px-4 py-2 rounded font-medium transition-colors";
      const styles = variant === 'outline' 
        ? "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300" 
        : "bg-blue-600 text-white hover:bg-blue-700";
      return <button className={cn(base, styles, className)} {...props}>{children}</button>
  },
  // Native HTML Mappings
  h1: ({ className, children, ...props }) => <h1 className={cn("text-2xl font-bold", className)} {...props}>{children}</h1>,
  h2: ({ className, children, ...props }) => <h2 className={cn("text-xl font-semibold", className)} {...props}>{children}</h2>,
  h3: ({ className, children, ...props }) => <h3 className={cn("text-lg font-medium", className)} {...props}>{children}</h3>,
  p: ({ className, children, ...props }) => <p className={className} {...props}>{children}</p>,
  span: ({ className, children, ...props }) => <span className={className} {...props}>{children}</span>,
  label: ({ className, children, ...props }) => <label className={cn("text-sm font-medium", className)} {...props}>{children}</label>,
  input: ({ className, ...props }) => <input className={cn("bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm", className)} {...props} />,
  select: ({ className, children, ...props }) => <select className={cn("bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm", className)} {...props}>{children}</select>,
  option: ({ children, ...props }) => <option {...props}>{children}</option>,
  
  // Custom / Icon placeholder
  Icon: ({ className, size = 16 }) => (
    <div className={cn("flex items-center justify-center text-zinc-400", className)} style={{ width: size, height: size }}>
       <div className="w-full h-full border-2 border-dashed border-current rounded-sm opacity-50" />
    </div>
  )
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

  // Sanitize props: Prevent React from crashing if 'style' is a string
  const sanitizedProps = { ...node.props };
  if (typeof sanitizedProps.style === 'string') {
    delete sanitizedProps.style;
  }

  return (
    <Component {...sanitizedProps} className={combinedClasses} data-nebula-id={node.id}>
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
        if (layout.direction === 'column') classes.push('flex-col');
        else if (layout.direction === 'row') classes.push('flex-row');
        else if (layout.direction === 'column-reverse') classes.push('flex-col-reverse');
        else if (layout.direction === 'row-reverse') classes.push('flex-row-reverse');

        classes.push(mapAlignment(layout.justify, 'justify'));
        classes.push(mapAlignment(layout.align, 'items'));

        if (layout.wrap) classes.push('flex-wrap');

    } else if (layout.mode === 'grid') {
        classes.push('grid');
        if (layout.columns) classes.push(`grid-cols-${layout.columns}`);
        classes.push(mapAlignment(layout.justify, 'justify'));
        classes.push(mapAlignment(layout.align, 'items'));
    } else if (layout.mode === 'absolute') {
        classes.push('absolute');
    }

    if (layout.gap) classes.push(layout.gap);
    return classes.join(' ');
}

function mapAlignment(align: Alignment | undefined, prefix: 'justify' | 'items'): string {
    if (!align) return '';
    switch (align) {
        case 'start': return `${prefix}-start`;
        case 'center': return `${prefix}-center`;
        case 'end': return `${prefix}-end`;
        case 'between': return prefix === 'justify' ? 'justify-between' : '';
        case 'around': return prefix === 'justify' ? 'justify-around' : '';
        case 'stretch': return prefix === 'items' ? 'items-stretch' : 'justify-stretch';
        default: return '';
    }
}

function resolveStyles(style: NebulaNode['style']) {
    return Object.values(style || {})
        .filter((val): val is string => typeof val === 'string')
        .join(' ');
}
