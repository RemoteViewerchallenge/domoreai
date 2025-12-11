import React from 'react';
import { useAnimations } from '../../src/theme/ThemeProvider.js';

/**
 * AnimationToggle component
 * 
 * Provides a simple toggle control for enabling/disabling animations globally.
 * The state is persisted via ThemeContext and updates the document dataset
 * which motion libraries can read to respect user preferences.
 * 
 * This is important for:
 * - Accessibility (users who prefer reduced motion)
 * - Performance (users on slower devices)
 * - User preference (some users simply prefer less animation)
 * 
 * @example
 * ```tsx
 * // In header or settings page
 * import { AnimationToggle } from '../components/AnimationToggle';
 * 
 * <AnimationToggle />
 * ```
 */
export const AnimationToggle: React.FC = () => {
  const { enabled, setEnabled } = useAnimations();

  return (
    <div className="flex items-center gap-2">
      <label 
        htmlFor="animation-toggle" 
        className="text-sm text-[var(--color-text)] cursor-pointer"
      >
        Animations
      </label>
      <div className="relative inline-block">
        <input
          id="animation-toggle"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="sr-only peer"
        />
        <label
          htmlFor="animation-toggle"
          className="block w-11 h-6 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-full peer-checked:bg-[var(--color-primary)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)]/50 transition-colors cursor-pointer"
        >
          <div 
            className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </label>
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">
        {enabled ? 'On' : 'Off'}
      </span>
    </div>
  );
};