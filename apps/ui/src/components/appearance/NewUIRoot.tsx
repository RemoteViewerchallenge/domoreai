import React, { useState, useEffect, useRef } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import { Command } from 'cmdk';

import { NewUIThemeProvider, useNewUITheme } from './NewUIThemeProvider.js';
import { buildCssVariablesFromTheme } from '../../design-system/cssVariables.js';
import { ThemeEditorSidebar } from './ThemeEditorSidebar.js';
import { UIDisplayPage } from '../../pages/UIDisplayPage.js';

import type { Theme } from '../../theme/types.js';
import type { DesignTheme } from '../../design-system/types.js';

const keyMap = {
  OPEN_COMMAND_MENU: 'ctrl+k',
  SAVE: ['ctrl+s', 'meta+s'],
  TOGGLE_THEME_EDITOR: 'ctrl+e',
};

const adaptThemeToDesignTheme = (theme: Theme): DesignTheme => {
    const getColor = (c: any) => (typeof c === 'object' && c !== null && 'value' in c) ? c.value : c;

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
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);

  // 1. Apply the current theme to the entire component
  const designTheme = adaptThemeToDesignTheme(theme);
  const cssVariables = buildCssVariablesFromTheme(designTheme);

  const handleUpdateTheme = (partial: Partial<Theme>) => {
      setTheme((prev) => ({ ...prev, ...partial }));
  };

  // 2. Hotkeys handlers
  const handlers = {
    OPEN_COMMAND_MENU: (event?: KeyboardEvent) => {
      event?.preventDefault();
      setShowCommandMenu((show) => !show);
    },
    TOGGLE_THEME_EDITOR: (event?: KeyboardEvent) => {
      event?.preventDefault();
      setShowThemeEditor((show) => !show);
    },
    SAVE: (event?: KeyboardEvent) => {
      event?.preventDefault();
      alert('Save action triggered!');
    },
  };

  // Effect to show/hide command menu
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandMenu((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
      <div
        id="mouse-root"
        className="w-screen h-screen bg-[var(--color-background)] text-[var(--color-text)] font-mono flex transition-colors duration-500"
        style={cssVariables as React.CSSProperties}
      >
        {showThemeEditor && (
          <ThemeEditorSidebar
            theme={theme}
            onUpdateTheme={handleUpdateTheme}
            onClose={() => setShowThemeEditor(false)}
          />
        )}

        {children ? children : <UIDisplayPage onToggleSidebar={() => setShowThemeEditor((show) => !show)} />}

        {showCommandMenu && (
          <Command.Dialog open={showCommandMenu} onOpenChange={setShowCommandMenu} label="Global Command Menu">
            <Command.Input placeholder="Type a command or search..." />
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>

              <Command.Group heading="Actions">
                <Command.Item onSelect={() => alert('Saving...')}>Save File</Command.Item>
                <Command.Item>Create New Project</Command.Item>
              </Command.Group>

              <Command.Group heading="Navigation">
                <Command.Item>Go to Settings</Command.Item>
                <Command.Item>Go to Workspace</Command.Item>
              </Command.Group>
            </Command.List>
          </Command.Dialog>
        )}

        <div className="absolute bottom-4 right-4 text-xs text-[var(--color-text-secondary)] bg-[var(--color-background-secondary)]/80 p-2 rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p>
            Hotkeys:{' '}
            <kbd className="px-2 py-1 border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]">Ctrl+K</kbd>, 
            <kbd className="px-2 py-1 border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]">Ctrl+E</kbd>
          </p>
        </div>
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

export default NewUIRoot;
