import React, { useState } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';

import { NewUIThemeProvider, useNewUITheme } from './NewUIThemeProvider.js';
import { buildCssVariablesFromTheme } from '../../design-system/cssVariables.js';
import { ThemeEditorSidebar } from './ThemeEditorSidebar.js';

import type { Theme } from '../../theme/types.js';
import type { DesignTheme } from '../../design-system/types.js';

const keyMap = {
  TOGGLE_THEME_EDITOR: 'ctrl+e',
};

const adaptThemeToDesignTheme = (theme: Theme): DesignTheme => {
    const getColor = (c: unknown) => (typeof c === 'object' && c !== null && 'value' in c) ? (c as { value: string }).value : c as string;
    return {
        colors: {
            primary: getColor(theme.colors.primary),
            secondary: getColor(theme.colors.secondary),
            accent: getColor(theme.colors.accent),
            success: getColor(theme.colors.success),
            background: theme.colors.background,
            backgroundSecondary: theme.colors.backgroundSecondary,
            text: theme.colors.text,
            textSecondary: theme.colors.textSecondary,
            border: theme.colors.border,
        },
        gradients: {
            primary: `linear-gradient(135deg, ${getColor(theme.colors.primary)} 0%, ${getColor(theme.colors.accent)} 100%)`,
            accent: `linear-gradient(135deg, ${getColor(theme.colors.accent)} 0%, ${getColor(theme.colors.secondary)} 100%)`,
            surface: `linear-gradient(180deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 100%)`,
            button: theme.colors.buttonBackground || `linear-gradient(180deg, ${theme.colors.backgroundSecondary} 0%, ${theme.colors.background} 100%)`,
        },
        typography: {
            fontFamilyUi: 'system',
            fontFamilyMono: 'mono',
            baseSize: theme.visual.fontSize,
            secondarySize: theme.visual.fontSize * 0.85,
        },
        visual: {
            borderWidth: theme.visual.borderWidth,
            glowIntensity: theme.visual.glowIntensity,
            radiusScale: 1,
            density: 'standard',
        }
    };
};

const NewUIInternal: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useNewUITheme();
  const [showThemeEditor, setShowThemeEditor] = useState(false);

  const designTheme = adaptThemeToDesignTheme(theme);
  const cssVariables = buildCssVariablesFromTheme(designTheme);

  const handlers = {
    TOGGLE_THEME_EDITOR: (event?: KeyboardEvent) => {
      event?.preventDefault();
      setShowThemeEditor((show) => !show);
    },
  };

  return (
    <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
      <div
        id="titanium-root"
        className="w-full h-full bg-[var(--color-background)] text-[var(--color-text)] font-mono flex relative overflow-hidden transition-colors duration-300"
        style={cssVariables as React.CSSProperties}
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full w-full relative z-0">
            {children}
        </div>

        {/* Floating Theme Editor */}
        {showThemeEditor && (
          <div className="absolute top-0 right-0 h-full z-[100] shadow-2xl flex">
             <ThemeEditorSidebar
                theme={theme}
                onUpdateTheme={(partial) => setTheme((prev) => ({ ...prev, ...partial }))}
                onClose={() => setShowThemeEditor(false)}
              />
          </div>
        )}
      </div>
    </GlobalHotKeys>
  );
};

export const NewUIRoot: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <NewUIThemeProvider>
      <NewUIInternal>{children}</NewUIInternal>
    </NewUIThemeProvider>
  );
};
