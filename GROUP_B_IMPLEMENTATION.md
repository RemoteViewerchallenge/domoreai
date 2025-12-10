# Group B Implementation: UI Scaffolding & Routing

This document describes the implementation of Group B features for the C.O.R.E. project.

## Overview

Group B adds the following features:
- **B1**: Feature flag system for gradual rollout of new COORP interface
- **B2**: AI Button component with tRPC endpoint stub
- **B3**: Animation toggle in ThemeContext
- **B4**: COORP page with node visualization

## Feature Flag System (B1)

### How to Enable the New COORP Interface

The feature flag can be controlled in two ways:

#### 1. Environment Variable (Global)
Set `VITE_ENABLE_NEW_COORP=true` in your `.env` file:
```bash
VITE_ENABLE_NEW_COORP=true
```

#### 2. LocalStorage (Per-User Testing)
Toggle the feature in the browser console:
```javascript
// Enable the new COORP interface
localStorage.setItem('feature_new_coorp_enabled', 'true');

// Disable and use legacy workspace
localStorage.setItem('feature_new_coorp_enabled', 'false');

// Clear to use environment variable setting
localStorage.removeItem('feature_new_coorp_enabled');
```

**Note**: LocalStorage takes precedence over the environment variable.

### Routes
- `/workspace` - Uses feature flag to show either COORP or legacy workspace
- `/workspace/legacy` - Always shows the legacy workspace (bypass feature flag)
- `/` - Root route also uses the feature flag

## AI Button Component (B2)

### Usage

```tsx
import { AiButton } from './components/ui/AiButton';

// In your component
<AiButton 
  source={{ type: 'coorp-node', nodeId: 'node-123' }}
  onResult={(result) => {
    console.log('AI Result:', result);
  }}
/>
```

### Source Types

The AiButton supports multiple source contexts:

```typescript
type AiSource =
  | { type: 'role'; roleId?: string }
  | { type: 'coorp-node'; nodeId?: string }
  | { type: 'vfs'; paths?: string[] }
  | { type: 'custom'; payload?: Record<string, unknown> };
```

### tRPC Endpoint

The AI router includes a `runWithContext` mutation that currently returns mock responses:

```typescript
// Usage in React component
const { mutateAsync: runAi } = trpc.ai.runWithContext.useMutation();

const result = await runAi({
  source: { type: 'role', roleId: 'role-123' },
  prompt: 'Your prompt here',
  roleId: 'optional-role-id'
});
```

**Note**: This is a stub implementation. It will be integrated with ContextService in the future.

## Animation Toggle (B3)

### Usage

The existing ThemeContext has been enhanced with animation controls:

```tsx
import { useAnimations } from './theme/ThemeProvider';

function MyComponent() {
  const { enabled, setEnabled } = useAnimations();
  
  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>
        Toggle Animations: {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
```

### Data Attribute

The document root element has a `data-animations` attribute that motion libraries can read:

```css
/* Disable animations when flag is off */
[data-animations="off"] * {
  animation: none !important;
  transition: none !important;
}
```

### In Motion Components

The AiButton component demonstrates how to use this:

```tsx
const { enabled: animationsEnabled } = useAnimations();
const MotionWrapper = animationsEnabled ? motion.span : 'span';
const motionProps = animationsEnabled ? { whileHover: { scale: 1.05 } } : {};

<MotionWrapper {...motionProps}>
  Content
</MotionWrapper>
```

## COORP Page (B4)

### Features

- Visual node-based interface
- Add/delete nodes
- AI Button on each node
- Grid background
- Responsive layout

### Database Models

Two new Prisma models have been added:

```prisma
model CoorpNode {
  id          String   @id @default(cuid())
  label       String
  x           Float    @default(0)
  y           Float    @default(0)
  data        Json     @default("{}")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sourceEdges CoorpEdge[] @relation("EdgeSource")
  targetEdges CoorpEdge[] @relation("EdgeTarget")
}

model CoorpEdge {
  id          String   @id @default(cuid())
  sourceId    String
  targetId    String
  label       String?
  data        Json     @default("{}")
  
  source      CoorpNode @relation("EdgeSource", fields: [sourceId], references: [id], onDelete: Cascade)
  target      CoorpNode @relation("EdgeTarget", fields: [targetId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([sourceId, targetId])
}
```

### tRPC Router

The COORP router provides full CRUD operations:

```typescript
// Node operations
trpc.coorp.listNodes.useQuery()
trpc.coorp.getNode.useQuery({ id: 'node-id' })
trpc.coorp.createNode.useMutation()
trpc.coorp.updateNode.useMutation()
trpc.coorp.deleteNode.useMutation()

// Edge operations
trpc.coorp.listEdges.useQuery()
trpc.coorp.createEdge.useMutation()
trpc.coorp.deleteEdge.useMutation()
```

## Dependencies Added

- `framer-motion@^12.23.26` - Animation library (replaces @motiondivision/motion which doesn't exist)
- `@phosphor-icons/react@^2.1.10` - Icon library

## Testing

### 1. Test Feature Flag

```bash
# Start the UI development server
cd apps/ui
pnpm dev

# Open browser to http://localhost:5173
# Open browser console and run:
localStorage.setItem('feature_new_coorp_enabled', 'true');
# Refresh the page - you should see the COORP interface

# To go back to legacy:
localStorage.setItem('feature_new_coorp_enabled', 'false');
# Refresh the page
```

### 2. Test AI Button

1. Navigate to `/workspace` with feature flag enabled
2. Click on any node's "AI" button
3. Enter a prompt in the text area
4. Click "Run"
5. Check the browser console for the mock response

### 3. Test Animation Toggle

```javascript
// In browser console:
// Get current theme
const theme = JSON.parse(localStorage.getItem('core-theme'));

// Toggle animations
theme.animations.enabled = false;
localStorage.setItem('core-theme', JSON.stringify(theme));
// Refresh page

// Check data attribute
document.documentElement.dataset.animations; // Should be 'off'
```

## Migration Required

To use the COORP database models, run the Prisma migration:

```bash
cd apps/api
pnpm prisma migrate dev --name add-coorp-models
```

**Warning**: Follow the repository's database safety guidelines:
- Check for dynamic tables before resetting
- Use `prisma migrate dev` instead of `db push`
- Never use `--accept-data-loss`

## Future Enhancements

1. **ContextService Integration**: Replace mock AI responses with actual ContextService integration
2. **Drag & Drop**: Add drag-and-drop support for node positioning
3. **Edge Drawing**: Visual edge creation between nodes
4. **Node Templates**: Pre-configured node types for common patterns
5. **Export/Import**: Save and load COORP graphs
6. **Real-time Collaboration**: Multiple users editing the same graph

## Files Changed

### UI (apps/ui)
- `src/components/FeatureFlagWrapper.tsx` (new)
- `src/components/ui/AiButton.tsx` (new)
- `src/pages/COORP.tsx` (new)
- `src/theme/ThemeProvider.tsx` (modified)
- `src/App.tsx` (modified)
- `package.json` (dependencies added)

### API (apps/api)
- `src/routers/ai.router.ts` (new)
- `src/routers/coorp.router.ts` (new)
- `src/routers/index.ts` (modified)
- `prisma/schema.prisma` (modified)
