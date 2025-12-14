import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Theme } from '../../theme/types.js';
import { defaultTheme } from '../../theme/presets.js';

interface NewUIThemeContextValue {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}

const NewUIThemeContext = createContext<NewUIThemeContextValue | undefined>(undefined);

export const NewUIThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <NewUIThemeContext.Provider value={value}>
      {children}
    </NewUIThemeContext.Provider>
  );
};

export const useNewUITheme = (): NewUIThemeContextValue => {
  const context = useContext(NewUIThemeContext);
  if (!context) {
    throw new Error('useNewUITheme must be used within a NewUIThemeProvider');
  }
  return context;
};