import React, { useState } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import { ThemeSidebar } from '../ThemeSidebar.js';
import { cn } from '../../../lib/utils.js';

const KEY_MAP = {
    TOGGLE_THEME: ['ctrl+e', 'command+e'],
    TOGGLE_AI: ['ctrl+k', 'command+k'],
    SAVE: ['ctrl+s', 'command+s'],
    ESCAPE: ['esc']
};

export const NebulaLayout = ({ children, header }: { children: React.ReactNode, header?: React.ReactNode }) => {
    const [showTheme, setShowTheme] = useState(false);

    // Close theme on Escape
    const handlers = {
        TOGGLE_THEME: (e?: KeyboardEvent) => { e?.preventDefault(); setShowTheme(p => !p); },
        TOGGLE_AI: (e?: KeyboardEvent) => { 
            e?.preventDefault(); 
            // 🟢 In Headless mode, the header should handle this or we dispatch an event
            window.dispatchEvent(new CustomEvent('nebula:toggle-ai'));
        },
        SAVE: (e?: KeyboardEvent) => {
             e?.preventDefault();
             window.dispatchEvent(new CustomEvent('nebula:save'));
        },
        ESCAPE: () => { setShowTheme(false); }
    };

    return (
        <GlobalHotKeys keyMap={KEY_MAP} handlers={handlers} allowChanges>
            <div className="flex flex-col h-screen w-screen bg-[var(--bg-background)] overflow-hidden text-[var(--text-primary)] font-sans selection:bg-[var(--color-primary)] selection:text-black">
                
                {/* 1. TOP COMMAND STRIP (Headless) */}
                {header && (
                    <div className="flex-none z-50 shadow-md">
                        {header}
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden relative">
                    {/* 2. THE STAGE (Full Width) */}
                    <main className="flex-1 relative z-0 overflow-hidden bg-[var(--bg-background)]">
                        {children}
                    </main>

                    {/* 3. THEME ENGINE (Overlay) */}
                    <div className={cn(
                        "absolute top-0 right-0 bottom-0 z-[100] w-80 shadow-2xl transition-transform duration-200 ease-out border-l border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur-xl",
                        showTheme ? "translate-x-0" : "translate-x-full"
                    )}>
                        <ThemeSidebar onClose={() => setShowTheme(false)} />
                    </div>
                </div>
            </div>
        </GlobalHotKeys>
    );
};
