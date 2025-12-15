import React from 'react';
import { UnifiedMenuBar } from './UnifiedMenuBar.js';

interface UnifiedLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

/**
 * UnifiedLayout
 *
 * The canonical layout for the application.
 * Enforces a fixed header (UnifiedMenuBar) and a flexible body with optional sidebar.
 * Uses CSS variables from the theme system.
 */
export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({ children, sidebar }) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden transition-colors duration-300">
      {/* Header */}
      <UnifiedMenuBar />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {sidebar && (
          <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-sidebar-background)] overflow-y-auto transition-colors duration-300 z-10">
            {sidebar}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto bg-[var(--color-background)] relative transition-colors duration-300 z-0">
          {children}
        </main>
      </div>
    </div>
  );
};
