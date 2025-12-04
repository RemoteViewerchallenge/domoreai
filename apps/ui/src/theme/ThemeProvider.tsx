import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Theme, ThemeContextValue, ThemePreset } from './types.js';
import { themePresets, defaultTheme } from './presets.js';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'core-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load from localStorage
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Colors
    root.style.setProperty('--color-primary', theme.colors.primary.value);
    root.style.setProperty('--color-secondary', theme.colors.secondary.value);
    root.style.setProperty('--color-accent', theme.colors.accent.value);
    root.style.setProperty('--color-success', theme.colors.success.value);
    root.style.setProperty('--color-warning', theme.colors.warning.value);
    root.style.setProperty('--color-error', theme.colors.error.value);
    root.style.setProperty('--color-info', theme.colors.info.value);
    
    // Background and text colors
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-background-secondary', theme.colors.backgroundSecondary);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-border', theme.colors.border);
    
    // Glows
    root.style.setProperty('--glow-primary', theme.colors.primary.glow);
    root.style.setProperty('--glow-secondary', theme.colors.secondary.glow);
    root.style.setProperty('--glow-accent', theme.colors.accent.glow);
    
    // Visual settings
    root.style.setProperty('--text-brightness', `${theme.visual.textBrightness}%`);
    root.style.setProperty('--border-brightness', `${theme.visual.borderBrightness}%`);
    root.style.setProperty('--bg-darkness', `${theme.visual.backgroundDarkness}%`);
    root.style.setProperty('--glow-intensity', `${theme.visual.glowIntensity}%`);
    root.style.setProperty('--font-size-base', `${theme.visual.fontSize}px`);
    root.style.setProperty('--font-weight', `${theme.visual.fontWeight}`);
    root.style.setProperty('--line-height', `${theme.visual.lineHeight}`);
    root.style.setProperty('--letter-spacing', `${theme.visual.letterSpacing}px`);
    root.style.setProperty('--border-width', `${theme.visual.borderWidth}px`);
    root.style.setProperty('--transparency', `${theme.visual.transparency}%`);
    
    // Animation settings
    root.style.setProperty('--animation-speed', `${theme.animations.speed}`);
    root.style.setProperty('--transition-duration', `${theme.animations.transitionDuration}ms`);
    root.style.setProperty('--hover-intensity', `${theme.animations.hoverEffectsIntensity}%`);
    
    // Layout settings
    root.style.setProperty('--spacing-multiplier', `${theme.layout.spacingMultiplier}`);
    root.style.setProperty('--gap-size', `${theme.layout.gapSize}px`);
    
    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const setTheme = React.useCallback((partial: Partial<Theme>) => {
    setThemeState((prev: Theme) => ({
      ...prev,
      ...partial,
      colors: { ...prev.colors, ...(partial.colors || {}) },
      visual: { ...prev.visual, ...(partial.visual || {}) },
      animations: { ...prev.animations, ...(partial.animations || {}) },
      sounds: { ...prev.sounds, ...(partial.sounds || {}) },
      widgets: { ...prev.widgets, ...(partial.widgets || {}) },
      layout: { ...prev.layout, ...(partial.layout || {}) },
    }));
  }, []);

  const applyPreset = React.useCallback((preset: ThemePreset) => {
    setThemeState(themePresets[preset]);
  }, []);

  const resetToDefault = React.useCallback(() => {
    setThemeState(defaultTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyPreset, resetToDefault }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};