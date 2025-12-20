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
  dataContext?: Record<string, any>; // Data context for bindings and logic
}

export const NebulaRenderer: React.FC<RendererProps> = ({
  tree,
  nodeId = tree.rootId,
  componentMap = Registry,
  dataContext = {}
}) => {
  const node = tree.nodes[nodeId];
  if (!node) return null;

  // --- LOGIC: LOOPS ---
  if (node.type === 'Loop' && node.logic) {
    const items = getNestedValue(dataContext, node.logic.loopData || '', []);
    return (
      <>
        {items.map((item: any, index: number) => {
          // Create new context with iterator variable
          const newContext = {
            ...dataContext,
            [node.logic!.iterator || 'item']: item,
            index
          };
          
          return node.children[0] ? (
            <NebulaRenderer
              key={index}
              tree={tree}
              nodeId={node.children[0]}
              componentMap={componentMap}
              dataContext={newContext}
            />
          ) : null;
        })}
      </>
    );
  }

  // --- LOGIC: CONDITIONS ---
  if (node.type === 'Condition' && node.logic) {
    const conditionValue = evaluateCondition(node.logic.condition || '', dataContext);
    if (!conditionValue) return null;
    
    return node.children[0] ? (
      <NebulaRenderer
        tree={tree}
        nodeId={node.children[0]}
        componentMap={componentMap}
        dataContext={dataContext}
      />
    ) : null;
  }

  // --- CUSTOM COMPONENTS (Black Box) ---
  if (node.type === 'Component' && node.componentName) {
    const CustomComponent = componentMap[node.componentName];
    if (CustomComponent) {
      // Resolve bindings for props
      const resolvedProps = resolveBindings(node, dataContext);
      return <CustomComponent {...resolvedProps} />;
    }
    return (
      <div className="text-red-500 text-xs p-2 border border-red-500/30 rounded">
        Missing Component: {node.componentName}
      </div>
    );
  }

  // --- STANDARD PRIMITIVES ---
  const Component = componentMap[node.type] || componentMap['Box'];

  // Resolve Tailwind Classes from Tokens
  const layoutClasses = resolveLayout(node.layout);
  const styleClasses = resolveStyles(node.style);
  const combinedClasses = cn(layoutClasses, styleClasses, node.props.className);

  // Resolve bindings in props
  const resolvedProps = resolveBindings(node, dataContext);

  // Sanitize props: Prevent React from crashing if 'style' is a string
  const sanitizedProps = { ...resolvedProps };
  
  // Remove 'key' prop - React handles this separately
  delete sanitizedProps.key;
  
  // Remove style if it's a string
  if (typeof sanitizedProps.style === 'string') {
    delete sanitizedProps.style;
  }
  
  // Remove event handlers that are strings (from JSX parsing)
  // These can't be executed anyway since they're not real functions
  Object.keys(sanitizedProps).forEach(key => {
    if (key.startsWith('on') && typeof sanitizedProps[key] === 'string') {
      console.warn(`[NebulaRenderer] Removing string event handler: ${key}="${sanitizedProps[key].substring(0, 50)}..."`);
      delete sanitizedProps[key];
    }
  });

  return (
    <Component {...sanitizedProps} className={combinedClasses} data-nebula-id={node.id}>
      {node.children.length > 0
        ? node.children.map(childId => (
            <NebulaRenderer
              key={childId}
              tree={tree}
              nodeId={childId}
              componentMap={componentMap}
              dataContext={dataContext}
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

/**
 * Resolve data bindings in node props
 */
function resolveBindings(node: NebulaNode, dataContext: Record<string, any>): Record<string, any> {
  const resolvedProps = { ...node.props };
  
  // Apply bindings
  if (node.bindings && node.bindings.length > 0) {
    node.bindings.forEach(binding => {
      const value = getNestedValue(dataContext, binding.sourcePath, binding.defaultValue);
      resolvedProps[binding.propName] = value;
    });
  }
  
  return resolvedProps;
}

/**
 * Get nested value from object using dot notation path
 * Example: getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
function getNestedValue(obj: Record<string, any>, path: string, defaultValue: any = undefined): any {
  if (!path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Evaluate a simple condition string
 * Supports basic property access and truthiness checks
 * Example: "props.isActive" or "user.isAdmin"
 */
function evaluateCondition(condition: string, dataContext: Record<string, any>): boolean {
  if (!condition) return false;
  
  // Simple property access evaluation
  const value = getNestedValue(dataContext, condition, false);
  
  // Convert to boolean
  return Boolean(value);
}
