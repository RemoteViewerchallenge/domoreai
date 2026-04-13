import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';import defaultTheme from './theme.json';

type Theme = typeof defaultTheme;

interface ThemeContextValue {
  theme: Theme;
  setColor: (key: keyof Theme['colors'], value: string) => void;
  setTypography: (key: keyof Theme['typography'], value: string) => void;
  setShape: (key: keyof Theme['shape'], value: string) => void;
  setDensity: (key: keyof Theme['density'], value: string) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'uibuilder-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--color-${cssKey}`, value);
  });

  // Typography
  root.style.setProperty('--font-sans', theme.typography.fontFamily);
  root.style.setProperty('--font-mono', theme.typography.fontMono);
  root.style.setProperty('--text-sm', theme.typography.sizeSm);
  root.style.setProperty('--text-base', theme.typography.sizeBase);
  root.style.setProperty('--text-lg', theme.typography.sizeLg);

  // Shape
  root.style.setProperty('--radius', theme.shape.radius);
  root.style.setProperty('--radius-full', theme.shape.radiusFull);

  // Density
  root.style.setProperty('--pad-sm', theme.density.paddingSm);
  root.style.setProperty('--pad-base', theme.density.paddingBase);
  root.style.setProperty('--pad-lg', theme.density.paddingLg);
  root.style.setProperty('--header-height', theme.density.headerHeight);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultTheme, ...JSON.parse(stored) } : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const setColor = (key: keyof Theme['colors'], value: string) => {
    setThemeState(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const setTypography = (key: keyof Theme['typography'], value: string) => {
    setThemeState(prev => ({
      ...prev,
      typography: { ...prev.typography, [key]: value }
    }));
  };

  const setShape = (key: keyof Theme['shape'], value: string) => {
    setThemeState(prev => ({
      ...prev,
      shape: { ...prev.shape, [key]: value }
    }));
  };

  const setDensity = (key: keyof Theme['density'], value: string) => {
    setThemeState(prev => ({
      ...prev,
      density: { ...prev.density, [key]: value }
    }));
  };

  const reset = () => {
    setThemeState(defaultTheme);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ThemeContext.Provider value={{ theme, setColor, setTypography, setShape, setDensity, reset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
