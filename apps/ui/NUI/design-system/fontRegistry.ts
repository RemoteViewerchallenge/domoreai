import type { FontKey } from './types.js';

// Central mapping from logical font keys to concrete CSS font-family stacks.
// Future pages should refer to FontKey values instead of hard-coding stacks.

export const fontRegistry: Record<FontKey, string> = {
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  tech: "'Rajdhani', system-ui, -apple-system, 'Segoe UI', sans-serif",
  humanist: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

