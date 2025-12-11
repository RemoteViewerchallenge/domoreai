import type { DesignTheme } from './types.js';
import { fontRegistry } from './fontRegistry.js';

// Build a flat map of CSS custom properties from a DesignTheme.
// Intended for previews and future app-shell integration, but not wired to current theme.

export function buildCssVariablesFromTheme(theme: DesignTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors
  vars['--color-primary'] = theme.colors.primary;
  vars['--color-secondary'] = theme.colors.secondary;
  vars['--color-accent'] = theme.colors.accent;
  vars['--color-success'] = theme.colors.success;
  vars['--color-background'] = theme.colors.background;
  vars['--color-background-secondary'] = theme.colors.backgroundSecondary;
  vars['--color-text'] = theme.colors.text;
  vars['--color-text-secondary'] = theme.colors.textSecondary;
  vars['--color-border'] = theme.colors.border;

  // Gradients
  vars['--gradient-primary'] = theme.gradients.primary;
  vars['--gradient-accent'] = theme.gradients.accent;
  vars['--gradient-surface'] = theme.gradients.surface;
  vars['--gradient-button'] = theme.gradients.button;

  // Typography
  vars['--font-family-ui'] = fontRegistry[theme.typography.fontFamilyUi];
  vars['--font-family-mono'] = fontRegistry[theme.typography.fontFamilyMono];
  vars['--font-size-base'] = `${theme.typography.baseSize}px`;
  vars['--font-size-secondary'] = `${theme.typography.secondarySize}px`;

  // Visual
  vars['--border-width-base'] = `${theme.visual.borderWidth}px`;
  vars['--glow-intensity'] = `${theme.visual.glowIntensity}`;
  vars['--radius-scale'] = `${theme.visual.radiusScale}`;
  vars['--density'] = theme.visual.density;

  return vars;
}

