import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME } from "@repo/nebula";
import type { NebulaTheme } from "@repo/nebula";

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

  useEffect(() => {
    const root = document.documentElement;
    // Apply all theme properties as CSS variables without constraints
    for (const [key, value] of Object.entries(theme)) {
      if (typeof value === "object") {
        // Handle nested objects
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          root.style.setProperty(
            `--nebula-${key}-${nestedKey}`,
            String(nestedValue)
          );
        }
      } else {
        root.style.setProperty(`--nebula-${key}`, String(value));
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useNebulaTheme = () => useContext(ThemeContext);
