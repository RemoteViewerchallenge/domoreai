/**
 * Neon color palette for VFS-based theming
 */
export const NEON_COLORS = {
  root: '#00FFFF',        // Cyan - Root directory
  depth1: '#FF00FF',      // Magenta - First level
  depth2: '#00FF00',      // Lime - Second level
  depth3: '#FFFF00',      // Yellow - Third level
  depth4: '#FF6600',      // Orange - Deep nesting
  workspace: '#9D00FF',   // Purple - /workspace directory
  agents: '#00FFAA',      // Teal - /agents directory
} as const;

/**
 * Get neon color based on VFS path
 */
export const getNeonColorForPath = (path: string): string => {
  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Special directories
  if (normalizedPath.includes('/workspace')) return NEON_COLORS.workspace;
  if (normalizedPath.includes('/agents')) return NEON_COLORS.agents;
  
  // Root
  if (normalizedPath === '/' || normalizedPath === '.') return NEON_COLORS.root;
  
  // Count depth by slashes
  const depth = normalizedPath.split('/').filter(Boolean).length;
  
  switch (depth) {
    case 1:
      return NEON_COLORS.depth1;
    case 2:
      return NEON_COLORS.depth2;
    case 3:
      return NEON_COLORS.depth3;
    default:
      return NEON_COLORS.depth4;
  }
};

/**
 * Get Tailwind-compatible shadow class for neon glow
 */
export const getNeonGlowClass = (color: string): string => {
  // Convert hex to RGB for shadow
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  return `shadow-[0_0_10px_rgba(${r},${g},${b},0.5)]`;
};

/**
 * Neon button colors (high contrast)
 */
export const NEON_BUTTON_COLORS = {
  run: {
    bg: 'bg-green-500',
    hover: 'hover:bg-green-400',
    text: 'text-black',
    border: 'border-green-400',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.6)]',
  },
  attach: {
    bg: 'bg-cyan-500',
    hover: 'hover:bg-cyan-400',
    text: 'text-black',
    border: 'border-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.6)]',
  },
  settings: {
    bg: 'bg-purple-500',
    hover: 'hover:bg-purple-400',
    text: 'text-black',
    border: 'border-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.6)]',
  },
  danger: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-400',
    text: 'text-black',
    border: 'border-red-400',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.6)]',
  },
  primary: {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_15px_rgba(234,179,8,0.6)]',
  },
};