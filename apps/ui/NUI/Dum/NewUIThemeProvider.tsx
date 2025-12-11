import React, { createContext, useContext, useState, useMemo } from 'react';
import type { DesignTheme } from '../design-system/types.js';
import { defaultDesignThemePresets } from '../design-system/presets.js';

interface NewUIThemeContextValue {
  theme: DesignTheme;
  setTheme: React.Dispatch<React.SetStateAction<DesignTheme>>;
}

const NewUIThemeContext = createContext<NewUIThemeContextValue | undefined>(undefined);

export const NewUIThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<DesignTheme>(defaultDesignThemePresets[0].theme);

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