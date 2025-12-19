export interface NebulaTheme {
  colors: {
    primary: string;   // Brand color (e.g., #3b82f6)
    secondary: string; // Accent color
    background: string; // Page background
    surface: string;    // Card/Container background
    text: string;       // Main text color
    border: string;     // Border color
  };
  typography: {
    fontFamily: string; // e.g., "Inter, sans-serif"
    baseSize: string;   // e.g., "16px"
    headingScale: number; // e.g., 1.25 (h1 = base * scale^4)
  };
  shape: {
    radius: string;     // e.g., "0.5rem"
    borderWidth: string; // e.g., "1px"
  };
  spacing: {
    unit: number;       // e.g., 4 (so p-1 = 4px)
  };
}

export const DEFAULT_THEME: NebulaTheme = {
  colors: {
    primary: '#0f172a',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#020617',
    border: '#e2e8f0',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    baseSize: '16px',
    headingScale: 1.2,
  },
  shape: {
    radius: '0.5rem',
    borderWidth: '1px',
  },
  spacing: {
    unit: 4,
  },
};
