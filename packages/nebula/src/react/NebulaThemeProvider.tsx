import React, { createContext, useContext, useEffect, useState } from 'react';
import { NebulaTheme, DEFAULT_THEME } from '../core/theme.js';

const ThemeContext = createContext<{
  theme: NebulaTheme;
  setTheme: (t: NebulaTheme) => void;
}>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export const NebulaThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: NebulaTheme;
}> = ({ children, initialTheme = DEFAULT_THEME }) => {
  const [theme, setTheme] = useState(initialTheme);

  // The Magic: Sync JSON State to CSS Variables
  useEffect(() => {
    const root = document.documentElement;

    // Colors
    root.style.setProperty('--nebula-primary', theme.colors.primary);
    root.style.setProperty('--nebula-secondary', theme.colors.secondary);
    root.style.setProperty('--nebula-bg', theme.colors.background);
    root.style.setProperty('--nebula-surface', theme.colors.surface);
    root.style.setProperty('--nebula-text', theme.colors.text);
    root.style.setProperty('--nebula-border', theme.colors.border);

    // Shape
    root.style.setProperty('--nebula-radius', theme.shape.radius);
    root.style.setProperty('--nebula-border-width', theme.shape.borderWidth);

    // Typography
    root.style.setProperty('--nebula-font', theme.typography.fontFamily);
    root.style.setProperty('--nebula-base-size', theme.typography.baseSize);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useNebulaTheme = () => useContext(ThemeContext);
