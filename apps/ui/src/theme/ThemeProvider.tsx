import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Theme, ThemeContextValue } from './types.js';
import { defaultTheme } from './presets.js';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'core-theme-current';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load current active theme from localStorage
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Robust Deep Merge Migration
        return {
          ...defaultTheme,
          ...parsed,
          assets: {
            ...defaultTheme.assets,
            ...(parsed.assets || {}),
            fonts: {
              ...defaultTheme.assets.fonts,
              ...(parsed.assets?.fonts || {})
            },
            icons: {
              ...defaultTheme.assets.icons,
              ...(parsed.assets?.icons || {})
            }
          },
          ai: {
            ...defaultTheme.ai,
            ...(parsed.ai || {})
          }
        };

      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Inject Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // 2. Inject Gradients
    if (theme.gradients.enabled) {
      root.style.setProperty('--bg-primary', theme.gradients.primary);
      root.style.setProperty('--bg-secondary', theme.gradients.secondary);
      root.style.setProperty('--bg-surface', theme.gradients.surface);
    } else {
      root.style.setProperty('--bg-primary', theme.colors.primary);
      root.style.setProperty('--bg-secondary', theme.colors.secondary);
      root.style.setProperty('--bg-surface', theme.colors.surface);
    }

    // 3. Inject Visuals
    root.style.setProperty('--radius-base', `${theme.visual.borderRadius}px`);
    root.style.setProperty('--border-width', `${theme.visual.borderWidth}px`);
    root.style.setProperty('--opacity-base', `${theme.visual.opacity}`);
    root.style.setProperty('--blur-base', `${theme.visual.blur}px`);

    // 4. Inject Font Families
    Object.entries(theme.assets.fonts.mappings).forEach(([key, family]) => {
      root.style.setProperty(`--font-${key}`, family);
    });

    // 5. Inject Font URLs (if not already present)
    theme.assets.fonts.urls.forEach(url => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.href = url;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    });

    // 6. Inject AI Intent Colors
    if (theme.ai && theme.ai.intents) {
      Object.entries(theme.ai.intents).forEach(([key, color]) => {
        root.style.setProperty(`--ai-intent-${key}`, color);
      });
    }

    // 7. Context UI tokens
    root.style.setProperty('--ai-ui-toolbarBg', 'var(--bg-secondary)');
    root.style.setProperty('--ai-ui-toolbarBorder', 'var(--border-color)');
    
    // Save current active theme to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const setTheme = React.useCallback((partial: Partial<Theme>) => {
    setThemeState((prev: Theme) => {
      // Create a fresh copy
      const next: Theme = { ...prev };

      // Helper for deep merging specific known branches
      if (partial.colors) next.colors = { ...prev.colors, ...partial.colors };
      if (partial.gradients) next.gradients = { ...prev.gradients, ...partial.gradients };
      if (partial.visual) next.visual = { ...prev.visual, ...partial.visual };
      if (partial.ai) next.ai = { ...prev.ai, ...partial.ai };
      
      if (partial.assets) {
         next.assets = {
           ...prev.assets,
           ...partial.assets,
           fonts: partial.assets.fonts ? { ...prev.assets.fonts, ...partial.assets.fonts } : prev.assets.fonts,
           icons: partial.assets.icons ? { ...prev.assets.icons, ...partial.assets.icons } : prev.assets.icons,
         };
         // Even deeper for mappings/tokenMap
         if (partial.assets.fonts?.mappings) {
             next.assets.fonts.mappings = { ...prev.assets.fonts.mappings, ...partial.assets.fonts.mappings };
         }
         if (partial.assets.icons?.tokenMap) {
             next.assets.icons.tokenMap = { ...prev.assets.icons.tokenMap, ...partial.assets.icons.tokenMap };
         }
      }

      // Handle properties not in the deep merge list (like mode, id, name, timestamp)
      if (partial.mode) next.mode = partial.mode;
      if (partial.id) next.id = partial.id;
      if (partial.name) next.name = partial.name;
      next.timestamp = Date.now();

      return next;
    });
  }, []);

  const resetToDefault = React.useCallback(() => {
    setThemeState(defaultTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetToDefault }}>
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