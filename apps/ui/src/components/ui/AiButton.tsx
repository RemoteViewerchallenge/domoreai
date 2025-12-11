import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { trpc } from '../../utils/trpc.js';
import { useAnimations } from '../../theme/ThemeProvider.js';

/**
 * AiSource - Context source types for AI operations
 * 
 * Defines where the AI should pull context from:
 * - role: Use a specific role's configuration and VFS context
 * - coorp-node: Use context from a COORP graph node
 * - vfs: Use specific file paths from virtual file system
 * - custom: Provide custom context payload
 */
export type AiSource =
  | { type: 'role'; roleId?: string }
  | { type: 'coorp-node'; nodeId?: string }
  | { type: 'vfs'; paths?: string[] }
  | { type: 'custom'; payload?: Record<string, unknown> };

interface AiButtonProps {
  source: AiSource;
  defaultRoleId?: string;
  onResult?: (res: { success: boolean; message: string; data?: Record<string, unknown> }) => void;
}

/**
 * AiButton component for Group B - AI Integration
 * 
 * Opens a popover for AI prompts and calls ai.runWithContext tRPC endpoint.
 * Integrates with ContextService and model broker for intelligent context building.
 * 
 * Features:
 * - Respects animation preferences via useAnimations hook
 * - Multiple source types (role, coorp-node, vfs, custom)
 * - Loading states and error handling
 * - Keyboard-accessible popover UI
 * 
 * @example
 * ```tsx
 * <AiButton
 *   source={{ type: 'coorp-node', nodeId: 'node-123' }}
 *   onResult={(result) => console.log(result)}
 * />
 * ```
 */
export function AiButton({ source, defaultRoleId, onResult }: AiButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { enabled: animationsEnabled } = useAnimations();
  const { mutateAsync: runAi, isLoading } = trpc.ai.runWithContext.useMutation();

  const handleRun = async () => {
    try {
      const res = await runAi({ source, roleId: defaultRoleId, prompt });
      onResult?.(res);
      setOpen(false);
      setPrompt('');
    } catch (err) {
      console.error('AI run failed', err);
      // TODO: show user-friendly error message UI
    }
  };

  const MotionWrapper = animationsEnabled ? motion.span : 'span';
  const motionProps = animationsEnabled ? { whileHover: { scale: 1.05 } } : {};

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        aria-label="AI helper"
        className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-[var(--color-background-secondary)] hover:bg-[var(--color-primary)]/20 border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
      >
        <MotionWrapper
          {...motionProps}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <Zap size={14} className="mr-1" />
          <span>AI</span>
        </MotionWrapper>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-80 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded shadow-lg">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt the AI..."
            rows={4}
            className="w-full p-2 text-sm bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setOpen(false);
                setPrompt('');
              }}
              className="px-3 py-1 text-xs rounded bg-[var(--color-background-secondary)] hover:bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleRun()}
              disabled={isLoading || !prompt.trim()}
              className="px-3 py-1 text-xs rounded bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
