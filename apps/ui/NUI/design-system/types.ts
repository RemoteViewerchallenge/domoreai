// Design system theme contracts for future pages (standalone from current app theme)
export type FontKey = 'system' | 'mono' | 'tech' | 'humanist';
export type DesignDensity = 'compact' | 'standard' | 'cozy';

export interface DesignThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface DesignThemeGradients {
  primary: string;
  accent: string;
  surface: string;
  button: string;
}

export interface DesignThemeTypography {
  fontFamilyUi: FontKey;
  fontFamilyMono: FontKey;
  baseSize: number; // px
  secondarySize: number; // px
}

export interface DesignThemeVisual {
  borderWidth: number; // px
  glowIntensity: number; // 0-100 percent
  radiusScale: number; // arbitrary scaling factor, 0-2
  density: DesignDensity;
}

export interface DesignTheme {
  colors: DesignThemeColors;
  gradients: DesignThemeGradients;
  typography: DesignThemeTypography;
  visual: DesignThemeVisual;
}

export interface DesignThemePreset {
  id: string;
  name: string;
  description?: string;
  theme: DesignTheme;
}
