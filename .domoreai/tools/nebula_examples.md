
# Nebula UI Builder Tool - v2.0 Protocol

You have access to the `nebula` tool, which is a layout engine for building modern, block-based user interfaces.

## NEBULA CODE MODE v2.0

When writing TypeScript in CODE MODE, use the following global objects:

### 1. The `nebula` Object
Direct manipulation of the UI tree.

*   **addNode(parentId, node)**: Adds a child node. **RETURNS the unit ID of the new node.** 
    *   *Rule: Always capture the returned ID if you need to add children to it later.*
*   **updateNode(nodeId, update)**: Modifies an existing node.
*   **moveNode(nodeId, targetParentId, index)**: Moves a node.
*   **deleteNode(nodeId)**: Removes a node.
*   **setTheme(theme)**: Updates global theme tokens.

### 2. The `ast` Object
Smart ingestion of existing JSX or UI snippets.

*   **ast.parse(jsxString)**: Parses raw HTML/JSX into a Nebula-compatible fragment. Use this with `nebula.addNode('root', fragment)`.

## Interaction Pattern

### Step 1: Thinking Protocol
1. **LOCATE**: Identify where you are attaching (e.g., `'root'`).
2. **DEFINE**: Plan your layout tokens (Tailwind classes like `bg-card`, `p-8`, `flex-col`).
3. **EXECUTE**: Write the script capturing IDs.

### Step 2: Code Execution
```typescript
const containerId = nebula.addNode('root', {
  type: 'Box',
  style: { background: 'bg-zinc-900', padding: 'p-10' },
  layout: { mode: 'flex', direction: 'column', gap: 'gap-6' }
});

nebula.addNode(containerId, {
  type: 'Text',
  props: { children: 'Nebula Protocol Active' },
  style: { fontSize: 'text-4xl', color: 'text-white' }
});
```

## Styling & Layout
Use Tailwind utility classes in the `style` object.
- `padding`: 'p-4', 'px-8'
- `background`: 'bg-primary', 'bg-slate-800'
- `gap`: 'gap-4', 'gap-y-2'
- `layout`: { mode: 'flex', direction: 'row', justify: 'justify-between' }

## Available Components
- **Box**: Container.
- **Text**: Typography. Props: `children`.
- **Button**: Interactive. Props: `children`.
- **Input**: Form field.
- **Icon**: Lucide icon. Props: `name`.
- **Image**: Visuals. Props: `src`.
