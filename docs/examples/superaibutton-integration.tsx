/**
 * SuperAiButton Integration Examples
 * 
 * This file shows various ways to integrate the SuperAiButton
 * into different parts of the application.
 */

import { SuperAiButton } from '@/components/ui/SuperAiButton';

// ============================================================================
// Example 1: FocusWorkspace (Bottom-Center, Expand Up)
// ============================================================================

export function FocusWorkspaceExample() {
  return (
    <div className="relative h-screen w-full bg-[var(--color-background)]">
      {/* Main workspace content */}
      <div className="h-full p-4">
        <h1>Focus Workspace</h1>
        {/* Your workspace content here */}
      </div>

      {/* SuperAiButton - Bottom Center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <SuperAiButton 
          contextId="focus_workspace"
          expandUp={true}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Card Component (Bottom-Right, Expand Up)
// ============================================================================

export function CardWithAiButton({ cardId, children }: { 
  cardId: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="relative border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
      {/* Card content */}
      <div className="mb-12">
        {children}
      </div>

      {/* SuperAiButton - Bottom Right */}
      <div className="absolute bottom-3 right-3">
        <SuperAiButton 
          contextId={`card_${cardId}`}
          expandUp={true}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Floating Action Button (Top-Right, Expand Down)
// ============================================================================

export function PageWithFloatingAI({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Page content */}
      <div className="p-6">
        {children}
      </div>

      {/* SuperAiButton - Top Right (Floating) */}
      <div className="fixed top-6 right-6 z-50">
        <SuperAiButton 
          contextId="global_page"
          expandUp={false}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Toolbar Integration (Inline)
// ============================================================================

export function ToolbarWithAI() {
  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)]">
      {/* Other toolbar buttons */}
      <button className="btn btn-sm">Save</button>
      <button className="btn btn-sm">Export</button>
      
      <div className="flex-1" /> {/* Spacer */}
      
      {/* SuperAiButton in toolbar */}
      <SuperAiButton 
        contextId="toolbar_context"
        expandUp={false}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Custom Handler (Override default dispatch)
// ============================================================================

export function CustomHandlerExample() {
  const handleCustomGenerate = (prompt: string) => {
    console.log('Custom AI command:', prompt);
    
    // Your custom logic here
    // For example: open a modal, trigger a specific action, etc.
    alert(`You said: ${prompt}`);
  };

  return (
    <div className="p-6">
      <h2>Custom Handler Example</h2>
      
      <div className="mt-4">
        <SuperAiButton 
          contextId="custom_context"
          onGenerate={handleCustomGenerate}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: Multiple Buttons (Different Contexts)
// ============================================================================

export function MultipleButtonsExample() {
  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      {/* Left Panel */}
      <div className="relative border border-[var(--color-border)] rounded-lg p-4 h-96">
        <h3>Code Editor</h3>
        <div className="absolute bottom-3 right-3">
          <SuperAiButton 
            contextId="code_editor"
            expandUp={true}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative border border-[var(--color-border)] rounded-lg p-4 h-96">
        <h3>Terminal</h3>
        <div className="absolute bottom-3 right-3">
          <SuperAiButton 
            contextId="terminal"
            expandUp={true}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 7: Conditional Rendering (Show/Hide based on state)
// ============================================================================

export function ConditionalAIButton() {
  const [showAI, setShowAI] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <div className="relative p-6">
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={() => setShowAI(!showAI)}
          className="btn btn-sm"
        >
          {showAI ? 'Hide' : 'Show'} AI
        </button>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="btn btn-sm"
        >
          {isEditing ? 'View' : 'Edit'} Mode
        </button>
      </div>

      {/* Only show AI button when in edit mode and showAI is true */}
      {showAI && isEditing && (
        <div className="fixed bottom-6 right-6">
          <SuperAiButton 
            contextId="conditional_context"
            expandUp={true}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 8: With Animation (Slide in from bottom)
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion';

export function AnimatedAIButton() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Show button after 1 second
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2"
          >
            <SuperAiButton 
              contextId="animated_context"
              expandUp={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Example 9: Responsive Positioning
// ============================================================================

export function ResponsiveAIButton() {
  return (
    <div className="relative min-h-screen">
      {/* Desktop: Bottom-right */}
      {/* Mobile: Bottom-center */}
      <div className="fixed bottom-6 right-6 md:right-6 md:left-auto left-1/2 md:translate-x-0 -translate-x-1/2">
        <SuperAiButton 
          contextId="responsive_context"
          expandUp={true}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 10: Integration with Zustand Store
// ============================================================================

import { create } from 'zustand';

// Define store
interface AIStore {
  currentContext: string;
  setContext: (context: string) => void;
}

const useAIStore = create<AIStore>((set) => ({
  currentContext: 'default',
  setContext: (context) => set({ currentContext: context }),
}));

export function StoreIntegratedAI() {
  const currentContext = useAIStore((state) => state.currentContext);
  const setContext = useAIStore((state) => state.setContext);

  return (
    <div className="p-6">
      <div className="mb-4">
        <label className="block mb-2">Current Context:</label>
        <select 
          value={currentContext}
          onChange={(e) => setContext(e.target.value)}
          className="select select-bordered"
        >
          <option value="editor">Editor</option>
          <option value="terminal">Terminal</option>
          <option value="browser">Browser</option>
        </select>
      </div>

      <div className="fixed bottom-6 right-6">
        <SuperAiButton 
          contextId={currentContext}
          expandUp={true}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Best Practices
// ============================================================================

/**
 * 1. POSITIONING
 *    - Use fixed positioning for floating buttons
 *    - Use absolute positioning for card-embedded buttons
 *    - Always provide adequate z-index (z-50 recommended)
 * 
 * 2. CONTEXT IDs
 *    - Use descriptive, unique context IDs
 *    - Format: `{component}_{identifier}` (e.g., "editor_main", "card_123")
 *    - Avoid generic IDs like "context1", "ai_button"
 * 
 * 3. EXPAND DIRECTION
 *    - expandUp={true} for bottom-positioned buttons
 *    - expandUp={false} for top-positioned buttons
 *    - Consider screen real estate when choosing
 * 
 * 4. CUSTOM HANDLERS
 *    - Use onGenerate for custom behavior
 *    - Omit onGenerate to use default dispatch
 *    - Always handle errors in custom handlers
 * 
 * 5. ACCESSIBILITY
 *    - Ensure button is keyboard accessible
 *    - Provide adequate touch target size (32px minimum)
 *    - Don't overlap with other interactive elements
 * 
 * 6. PERFORMANCE
 *    - Lazy load when possible
 *    - Use conditional rendering for hidden states
 *    - Avoid rendering multiple buttons unnecessarily
 */
