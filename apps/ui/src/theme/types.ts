export type ThemePreset = 'light' | 'minimal' | 'standard' | 'flashy' | 'extreme';

export type MenuStyle = 'compact' | 'standard' | 'dashboard';

export type IconTheme = 'outline' | 'filled' | 'duotone';

export type Density = 'comfortable' | 'normal' | 'compact';

export interface NeonColor {
  name: string;
  value: string;
  glow: string;
}

export interface ThemeColors {
  primary: NeonColor;
  secondary: NeonColor;
  accent: NeonColor;
  success: NeonColor;
  warning: NeonColor;
  error: NeonColor;
  info: NeonColor;
  // New: explicit background and text colors
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  menuBarBackground?: string;
  
  // New UI Element Colors
  cardBackground?: string;
  cardHeaderBackground?: string;
  cardBorder?: string;
  sidebarBackground?: string;
  sidebarBorder?: string;
  
  // Button & Icon Colors
  buttonBackground?: string; // Can be gradient
  buttonText?: string;
  iconColor?: string;
}

export interface VisualSettings {
  textBrightness: number; // 50-100
  borderBrightness: number; // 50-100
  backgroundDarkness: number; // 0-30
  glowIntensity: number; // 0-100
  fontSize: number; // 8-24
  fontWeight: number; // 400-900
  lineHeight: number; // 1.0-2.0
  letterSpacing: number; // -2 to 4
  borderWidth: number; // 1-4
  borderGlow: boolean;
  transparency: number; // 0-90
  blurEffects: boolean;
}

export interface AnimationSettings {
  enabled: boolean;
  speed: number; // 0.1-3
  hoverEffectsIntensity: number; // 0-100
  transitionDuration: number; // 100-1000ms
  particleEffects: boolean;
  screenShake: boolean;
}

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  clickSound: boolean;
  hoverSound: boolean;
  successSound: boolean;
  errorSound: boolean;
}

export interface WidgetSettings {
  clock: {
    enabled: boolean;
    style: 'analog' | 'digital' | 'both';
    size: 'small' | 'medium' | 'large';
  };
  newsFeed: {
    enabled: boolean;
    speed: number; // 1-10
    source: string;
  };
  logo: {
    enabled: boolean;
    type: 'custom' | 'seahawks';
    animated: boolean;
    size: 'small' | 'medium' | 'large';
  };
  systemStats: {
    enabled: boolean;
    metrics: string[];
  };
}

export interface LayoutSettings {
  menuStyle: MenuStyle;
  iconTheme: IconTheme;
  density: Density;
  spacingMultiplier: number; // 0.5-2
  gapSize: number; // 0-32
}

export interface Theme {
  preset: ThemePreset;
  colors: ThemeColors;
  visual: VisualSettings;
  animations: AnimationSettings;
  sounds: SoundSettings;
  widgets: WidgetSettings;
  layout: LayoutSettings;
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  applyPreset: (preset: ThemePreset) => void;
  resetToDefault: () => void;
}