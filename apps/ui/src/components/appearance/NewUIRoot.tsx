import React, { useState, useEffect } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import { Command } from 'cmdk';

import { NewUIThemeProvider, useNewUITheme } from './NewUIThemeProvider.js';
import { buildCssVariablesFromTheme } from '../design-system/cssVariables.js';
import { ThemeEditorSidebar } from './ThemeEditorSidebar.js';
import { UIDisplayPage } from './UIDisplayPage.js';

const keyMap = {
  OPEN_COMMAND_MENU: 'ctrl+k',
  SAVE: ['ctrl+s', 'meta+s'],
  TOGGLE_THEME_EDITOR: 'ctrl+e',
};

const NewUIInternal: React.FC = () => {
  const { theme, setTheme } = useNewUITheme();
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);

  // 1. Apply the current theme to the entire component
  const cssVariables = buildCssVariablesFromTheme(theme);

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
            onUpdateTheme={setTheme}
            onClose={() => setShowThemeEditor(false)}
          />
        )}

        <UIDisplayPage onToggleSidebar={() => setShowThemeEditor((show) => !show)} />

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

export const NewUIRoot: React.FC = () => {
  return (
    <NewUIThemeProvider>
      <NewUIInternal />
    </NewUIThemeProvider>
  );
};

export default NewUIRoot;
