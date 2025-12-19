# Nebula UI Builder Tool

## Overview
The Nebula UI Builder is a code-first UI construction system that allows you to programmatically build React interfaces using a tree-based API. This tool is designed for AI agents to create dynamic, responsive UIs without writing JSX directly.

## Core Principles

### 1. You must strictly use these methods to build the UI:

```typescript
interface NebulaOps {
  /**
   * Creates a new node and attaches it to a parent.
   * Returns the new Node ID (string).
   */
  addNode(
    parentId: string, 
    node: {
      type: 'Box' | 'Text' | 'Button' | 'Card' | 'Image' | 'Icon'; // See Component Registry
      props?: Record<string, any>;
      style?: StyleTokens;
      layout?: LayoutConfig;
      meta?: { label?: string };
    }
  ): string;

  /**
   * Updates an existing node's props or styles.
   */
  updateNode(nodeId: string, updates: Partial<NebulaNode>): void;

  /**
   * Moves a node to a new location in the tree.
   */
  moveNode(nodeId: string, newParentId: string, index: number): void;
  
  /**
   * Deletes a node and its children.
   */
  deleteNode(nodeId: string): void;
}
```

### 2. Style & Layout Tokens (The "Nebula Doctrine")

**NEVER use pixel values (e.g., width: "100px"). Use Tailwind tokens.**

- **Layout**: controlled by the `layout` prop, not `style`.
- **Styles**: controlled by `style` prop using Tailwind utility mappings.

```typescript
// Valid Layout Config
const flexRow = { 
  mode: 'flex', 
  direction: 'row', 
  justify: 'between', 
  align: 'center', 
  gap: 'gap-4' 
};

const flexCol = { 
  mode: 'flex', 
  direction: 'column', 
  gap: 'gap-2' 
};

const grid = { 
  mode: 'grid', 
  columns: 3, 
  gap: 'gap-4' 
};

// Valid Style Tokens
const cardStyle = { 
  background: 'bg-card', 
  padding: 'p-6', 
  radius: 'rounded-xl', 
  border: 'border', 
  shadow: 'shadow-sm' 
};
```

### 3. Coding Patterns (How to Build)

#### Pattern A: The Recursive Build (Preferred)
Always capture the id returned by `addNode` to append children to it.

```typescript
// ❌ BAD: Guessing IDs
nebula.addNode('root', { type: 'Box', id: 'my-box' }); // Error: ID is auto-generated

// ✅ GOOD: Capture and Nest
const containerId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'flex', direction: 'column', align: 'center', gap: 'gap-8' },
  style: { padding: 'p-12', background: 'bg-muted/10' }
});

const cardId = nebula.addNode(containerId, {
  type: 'Card',
  style: { width: 'w-full max-w-md', background: 'bg-background' }
});

nebula.addNode(cardId, {
  type: 'Text',
  props: { content: 'Welcome to Nebula', type: 'h1' }
});
```

#### Pattern B: The "Ingest & Explode" (For Cloning)
If the user provides raw JSX or HTML, use the AST engine.

```typescript
// User Input: "Make a card that looks like <div className='p-4 bg-red-500'>...</div>"

const rawCode = `<div className='p-4 bg-red-500'>...</div>`;
const fragment = ast.parse(rawCode); // Returns a NebulaNode structure

// Manually add the parsed result to the tree
// (Note: Real implementation might need a recursive adder helper)
nebula.addNode('root', fragment);
```

### 4. Available Components (The Registry)

- **Box**: Generic container (div). Use for all layouts.
- **Text**: Typography. Props: `{ content: string, type: 'h1' | 'h2' | 'h3' | 'p' | 'span' }`.
- **Button**: Interactive. Props: `{ children: string, variant: 'default' | 'outline' | 'ghost' }`.
- **Input**: Form fields. Props: `{ placeholder: string }`.
- **Icon**: Lucide icons. Props: `{ name: 'User' | 'Settings' | ... }` (any Lucide icon name).
- **Image**: Props: `{ src: string, alt: string }`.
- **Card**: Pre-styled container with elevation and borders.

## Usage Examples

### Example 1: Simple Login Form

```typescript
// Create main container
const mainId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'flex', direction: 'column', align: 'center', justify: 'center', gap: 'gap-4' },
  style: { padding: 'p-8', background: 'bg-background', minHeight: 'min-h-screen' }
});

// Create card
const cardId = nebula.addNode(mainId, {
  type: 'Card',
  style: { width: 'w-full max-w-md', padding: 'p-6' }
});

// Add title
nebula.addNode(cardId, {
  type: 'Text',
  props: { content: 'Login', type: 'h1' },
  style: { marginBottom: 'mb-4', textAlign: 'text-center' }
});

// Add email input
nebula.addNode(cardId, {
  type: 'Input',
  props: { placeholder: 'Email' },
  style: { marginBottom: 'mb-3' }
});

// Add password input
nebula.addNode(cardId, {
  type: 'Input',
  props: { placeholder: 'Password', type: 'password' },
  style: { marginBottom: 'mb-4' }
});

// Add submit button
nebula.addNode(cardId, {
  type: 'Button',
  props: { children: 'Sign In', variant: 'default' },
  style: { width: 'w-full' }
});
```

### Example 2: Dashboard Grid

```typescript
// Create dashboard container
const dashboardId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'grid', columns: 3, gap: 'gap-6' },
  style: { padding: 'p-8' }
});

// Add stat cards
const stats = [
  { label: 'Total Users', value: '1,234' },
  { label: 'Revenue', value: '$45,678' },
  { label: 'Active Sessions', value: '89' }
];

stats.forEach(stat => {
  const cardId = nebula.addNode(dashboardId, {
    type: 'Card',
    style: { padding: 'p-6' }
  });
  
  nebula.addNode(cardId, {
    type: 'Text',
    props: { content: stat.label, type: 'p' },
    style: { color: 'text-muted-foreground', fontSize: 'text-sm' }
  });
  
  nebula.addNode(cardId, {
    type: 'Text',
    props: { content: stat.value, type: 'h2' },
    style: { fontSize: 'text-3xl', fontWeight: 'font-bold', marginTop: 'mt-2' }
  });
});
```

### Example 3: Updating Existing Nodes

```typescript
// Update a button's style
nebula.updateNode(buttonId, {
  style: { background: 'bg-primary', color: 'text-white' }
});

// Update text content
nebula.updateNode(textId, {
  props: { content: 'Updated Text!' }
});
```

### Example 4: Moving and Reorganizing

```typescript
// Move a card to a different container
nebula.moveNode(cardId, newContainerId, 0); // Insert at index 0

// Delete a node and all its children
nebula.deleteNode(oldCardId);
```

## Best Practices

1. **Always capture node IDs**: Never hardcode or guess node IDs. Always use the return value from `addNode`.

2. **Use semantic component types**: Choose the right component for the job (Text for typography, Box for layout, Card for elevated containers).

3. **Leverage layout configs**: Use the `layout` prop to control flexbox/grid behavior instead of mixing layout styles into the `style` prop.

4. **Follow Tailwind conventions**: Use Tailwind utility class names for all styling (e.g., `bg-primary`, `p-4`, `rounded-lg`).

5. **Build hierarchically**: Start with containers, then add content. Think of the UI as a tree structure.

6. **Avoid inline styles**: Never use pixel values or raw CSS. Always use Tailwind tokens.

## Common Mistakes to Avoid

❌ **Don't do this:**
```typescript
// Hardcoded IDs
nebula.addNode('root', { type: 'Box', id: 'my-custom-id' });

// Pixel values
nebula.addNode(parentId, { 
  type: 'Box', 
  style: { width: '200px', height: '100px' } 
});

// Mixing layout in style
nebula.addNode(parentId, {
  type: 'Box',
  style: { display: 'flex', flexDirection: 'column' }
});
```

✅ **Do this instead:**
```typescript
// Capture auto-generated IDs
const boxId = nebula.addNode('root', { type: 'Box' });

// Use Tailwind tokens
nebula.addNode(parentId, { 
  type: 'Box', 
  style: { width: 'w-48', height: 'h-24' } 
});

// Use layout prop
nebula.addNode(parentId, {
  type: 'Box',
  layout: { mode: 'flex', direction: 'column' }
});
```

## Advanced Patterns

### Conditional Rendering
```typescript
// Build different UIs based on conditions
if (userIsLoggedIn) {
  const dashboardId = nebula.addNode('root', { type: 'Box' });
  // ... build dashboard
} else {
  const loginId = nebula.addNode('root', { type: 'Box' });
  // ... build login form
}
```

### Dynamic Lists
```typescript
const listId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'flex', direction: 'column', gap: 'gap-2' }
});

items.forEach(item => {
  const itemId = nebula.addNode(listId, {
    type: 'Card',
    style: { padding: 'p-4' }
  });
  
  nebula.addNode(itemId, {
    type: 'Text',
    props: { content: item.title, type: 'h3' }
  });
});
```

### Responsive Layouts
```typescript
// Use responsive Tailwind classes
const containerId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'grid', columns: 1, gap: 'gap-4' },
  style: { 
    // Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
    gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
  }
});
```

## Summary

The Nebula UI Builder provides a powerful, code-first approach to building UIs. By following these patterns and principles, you can create sophisticated, responsive interfaces programmatically while maintaining clean, maintainable code. Remember: **capture IDs, use Tailwind tokens, and think hierarchically**.
