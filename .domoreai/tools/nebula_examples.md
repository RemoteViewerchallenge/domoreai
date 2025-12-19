
# Nebula UI Builder Tool

You have access to the `nebula` tool, which is a layout engine for building modern, block-based user interfaces.

## Core Concepts

1.  **Nodes**: Everything is a node (`NebulaNode`).
2.  **Layout**: Uses Flexbox-like properties (`mode`, `direction`, `justify`, `align`).
3.  **Styles**: Uses Tailwind CSS tokens in `style` object or `props.className`.

## Operations

You can perform the following actions via the `nebula` tool or by outputting the corresponding TypeScript code using `NebulaOps` (if in Code Mode):

### 1. Add Node
Adds a new child node to a parent.

```typescript
const nodeId = ops.addNode('parent-id', {
  type: 'Box', // or 'Text', 'Button', 'Input', 'Image', 'Icon'
  layout: { mode: 'flex', direction: 'row', gap: 'gap-4' },
  style: { padding: 'p-4', background: 'bg-card' },
  props: { className: 'shadow-sm' }
});
```

### 2. Update Node
Modifies properties of an existing node.

```typescript
ops.updateNode('node-id', {
  style: { background: 'bg-primary/10' },
  props: { disabled: true }
});
```

### 3. Move Node
 Reorders a node or moves it to a different parent.

```typescript
ops.moveNode('node-id', 'new-parent-id', 0); // Move to index 0
```

### 4. Delete Node
Removes a node and its children.

```typescript
ops.deleteNode('node-id');
```

## Available Components

- **Box**: Generic container (div).
- **Text**: Text element (span/p/h1). Props: `content`, `type` (h1, p, etc).
- **Button**: Interactive button. Props: `onClick`, `variant` (default, outline, ghost).
- **Input**: Form input.
- **Icon**: Lucide icon. Props: `name` (e.g. "User", "Home").
- **Image**: Img tag. Props: `src`, `alt`.

## Best Practices

- **Use Tokens**: Always use Tailwind utility classes for styling (e.g., `p-4`, `bg-red-500`). Avoid arbitrary pixel values.
- **Flexbox**: Use `mode: 'flex'` for most layouts.
- **Ids**: Use descriptive IDs if generating static structures, or let the engine assign them.

## Type Definitions

```typescript
export type NebulaId = string;
export type LayoutMode = 'flex' | 'grid' | 'absolute' | 'flow';
export type Direction = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type Alignment = 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around';

export interface StyleTokens {
  padding?: 'p-0' | 'p-2' | 'p-4' | 'p-8' | string;
  gap?: 'gap-0' | 'gap-2' | 'gap-4' | 'gap-8' | string;
  radius?: 'rounded-none' | 'rounded-sm' | 'rounded-md' | 'rounded-lg' | 'rounded-full';
  shadow?: 'shadow-none' | 'shadow-sm' | 'shadow-md' | 'shadow-lg';
  background?: string;
  color?: string;
  border?: string;
  width?: 'w-full' | 'w-auto' | 'w-screen' | string;
  height?: 'h-full' | 'h-auto' | 'h-screen' | string;
}

export interface NebulaNode {
  id: NebulaId;
  type: string;
  props: Record<string, any>;
  style: StyleTokens;
  layout?: {
    mode: LayoutMode;
    direction?: Direction;
    justify?: Alignment;
    align?: Alignment;
    wrap?: boolean;
    columns?: number;
    gap?: string;
  };
  parentId?: NebulaId;
  children: NebulaId[];
  meta?: {
    label?: string;
    locked?: boolean;
    hidden?: boolean;
    source?: 'ai-gen' | 'human' | 'imported';
    aiDescription?: string;
  };
}
```
