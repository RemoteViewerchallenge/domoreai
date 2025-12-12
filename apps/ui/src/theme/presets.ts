import type { Theme } from './types.js';

// Helper for consistent neon colors structure
const createColor = (name: string, value: string, glow: string) => ({ name, value, glow });

const commonSettings = {
  visual: {
    textBrightness: 100,
    borderBrightness: 100,
    backgroundDarkness: 0,
    glowIntensity: 20,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
    borderWidth: 1,
    borderGlow: false,
    transparency: 0,
    blurEffects: true,
  },
  animations: {
    enabled: true,
    speed: 1,
    hoverEffectsIntensity: 20,
    transitionDuration: 200,
    particleEffects: false,
    screenShake: false,
  },
  sounds: {
    enabled: false,
    volume: 50,
    clickSound: false,
    hoverSound: false,
    successSound: false,
    errorSound: false,
  },
  widgets: {
    clock: { enabled: false, style: 'digital' as const, size: 'small' as const },
    newsFeed: { enabled: false, speed: 5, source: '' },
    logo: { enabled: false, type: 'custom' as const, animated: false, size: 'small' as const },
    systemStats: { enabled: false, metrics: [] },
  },
  layout: {
    menuStyle: 'standard' as const,
    iconTheme: 'outline' as const,
    density: 'normal' as const,
    spacingMultiplier: 1,
    gapSize: 12,
  },
};

export const lightTheme: Theme = {
  preset: 'light',
  colors: {
    primary: createColor('Blue', '#2563eb', '0 0 10px rgba(37, 99, 235, 0.3)'),
    secondary: createColor('Purple', '#7c3aed', '0 0 10px rgba(124, 58, 237, 0.3)'),
    accent: createColor('Pink', '#db2777', '0 0 10px rgba(219, 39, 119, 0.3)'),
    success: createColor('Green', '#16a34a', '0 0 10px rgba(22, 163, 74, 0.3)'),
    warning: createColor('Orange', '#ea580c', '0 0 10px rgba(234, 88, 12, 0.3)'),
    error: createColor('Red', '#dc2626', '0 0 10px rgba(220, 38, 38, 0.3)'),
    info: createColor('Sky', '#0284c7', '0 0 10px rgba(2, 132, 199, 0.3)'),
    
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    
    menuBarBackground: '#ffffff',
    cardBackground: '#ffffff',
    cardHeaderBackground: '#f1f5f9',
    cardBorder: '#e2e8f0',
    sidebarBackground: '#f8fafc',
    sidebarBorder: '#e2e8f0',
    
    buttonBackground: '#f1f5f9',
    buttonText: '#0f172a',
    iconColor: '#475569',
  },
  ...commonSettings,
};

export const darkTheme: Theme = {
  preset: 'standard',
  colors: {
    primary: createColor('Cyan', '#06b6d4', '0 0 15px rgba(6, 182, 212, 0.5)'),
    secondary: createColor('Violet', '#8b5cf6', '0 0 15px rgba(139, 92, 246, 0.5)'),
    accent: createColor('Fuchsia', '#d946ef', '0 0 15px rgba(217, 70, 239, 0.5)'),
    success: createColor('Emerald', '#10b981', '0 0 15px rgba(16, 185, 129, 0.5)'),
    warning: createColor('Amber', '#f59e0b', '0 0 15px rgba(245, 158, 11, 0.5)'),
    error: createColor('Rose', '#f43f5e', '0 0 15px rgba(244, 63, 94, 0.5)'),
    info: createColor('Blue', '#3b82f6', '0 0 15px rgba(59, 130, 246, 0.5)'),

    background: '#09090b',
    backgroundSecondary: '#18181b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#27272a',

    menuBarBackground: '#000000',
    cardBackground: '#09090b',
    cardHeaderBackground: '#18181b',
    cardBorder: '#27272a',
    sidebarBackground: '#09090b',
    sidebarBorder: '#27272a',

    buttonBackground: 'linear-gradient(to bottom, #27272a, #18181b)',
    buttonText: '#e2e8f0',
    iconColor: '#94a3b8',
  },
  ...commonSettings,
};

export const grayTheme: Theme = {
  preset: 'minimal',
  colors: {
    primary: createColor('Gray', '#9ca3af', '0 0 10px rgba(156, 163, 175, 0.3)'),
    secondary: createColor('Slate', '#64748b', '0 0 10px rgba(100, 116, 139, 0.3)'),
    accent: createColor('Zinc', '#71717a', '0 0 10px rgba(113, 113, 122, 0.3)'),
    success: createColor('Green', '#4ade80', '0 0 10px rgba(74, 222, 128, 0.3)'),
    warning: createColor('Yellow', '#facc15', '0 0 10px rgba(250, 204, 21, 0.3)'),
    error: createColor('Red', '#f87171', '0 0 10px rgba(248, 113, 113, 0.3)'),
    info: createColor('Blue', '#60a5fa', '0 0 10px rgba(96, 165, 250, 0.3)'),

    background: '#1f2937',
    backgroundSecondary: '#374151',
    text: '#f3f4f6',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    border: '#4b5563',

    menuBarBackground: '#111827',
    cardBackground: '#1f2937',
    cardHeaderBackground: '#374151',
    cardBorder: '#4b5563',
    sidebarBackground: '#1f2937',
    sidebarBorder: '#4b5563',

    buttonBackground: '#374151',
    buttonText: '#f3f4f6',
    iconColor: '#d1d5db',
  },
  ...commonSettings,
};

export const themePresets: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  gray: grayTheme,
};

export const defaultTheme = darkTheme;

