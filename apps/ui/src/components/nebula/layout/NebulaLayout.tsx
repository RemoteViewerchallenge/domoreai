import React, { useState } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import { UnifiedNebulaBar } from '../../../nebula/features/navigation/UnifiedNebulaBar.js';
import { NebulaSidebar } from '../NebulaSidebar.js';
import { ThemeSidebar } from '../ThemeSidebar.js';
import { cn } from '../../../lib/utils.js';

// 1. Define the Global Command Map
const KEY_MAP = {
    TOGGLE_THEME: ['ctrl+e', 'command+e'],
    TOGGLE_AI: ['ctrl+k', 'command+k'],
    SAVE: ['ctrl+s', 'command+s'],
    ESCAPE: ['esc']
};

export const NebulaLayout = ({ children }: { children: React.ReactNode }) => {
    // State for the "Floating" Panels
    const [showTheme, setShowTheme] = useState(false);
    const [showAi, setShowAi] = useState(false);

    // 2. Define Handlers
    const handlers = {
        TOGGLE_THEME: (e?: KeyboardEvent) => {
            e?.preventDefault();
            setShowTheme(prev => !prev);
        },
        TOGGLE_AI: (e?: KeyboardEvent) => {
            e?.preventDefault();
            setShowAi(true);
            // We use setTimeout to wait for the input to mount before focusing
            setTimeout(() => {
                const input = document.getElementById('nebula-ai-input');
                if (input) input.focus();
            }, 50);
        },
        SAVE: (e?: KeyboardEvent) => {
             e?.preventDefault();
             // Dispatch a custom event that specific pages (Builder) can listen to
             window.dispatchEvent(new CustomEvent('nebula:save'));
        },
        ESCAPE: () => {
            setShowTheme(false);
            setShowAi(false);
            // Defocus active elements if needed
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    };

    return (
        <GlobalHotKeys keyMap={KEY_MAP} handlers={handlers} allowChanges>
            <div className="flex flex-col h-screen w-screen bg-[var(--bg-background)] overflow-hidden text-[var(--text-primary)] font-sans">
                
                {/* A. Top Command Bar (High Priority) */}
                <div className="flex-none z-50">
                    <UnifiedNebulaBar aiOpen={showAi} setAiOpen={setShowAi} />
                </div>

                <div className="flex-1 flex overflow-hidden relative">
                    
                    {/* B. Activity Bar (Left) */}
                    <div className="flex-none z-40">
                        <NebulaSidebar />
                    </div>

                    {/* C. The Stage (Where the App/Builder lives) */}
                    <main className="flex-1 relative z-0 overflow-hidden bg-[var(--bg-background)]">
                        {children}
                    </main>

                    {/* D. Floating Theme Engine (Right) */}
                    <div className={cn(
                        "absolute top-0 right-0 bottom-0 z-[100] transition-transform duration-200 ease-out pointer-events-none flex",
                        showTheme ? "translate-x-0" : "translate-x-full"
                    )}>
                        <div className="pointer-events-auto shadow-2xl h-full">
                            <ThemeSidebar onClose={() => setShowTheme(false)} />
                        </div>
                    </div>

                </div>
            </div>
        </GlobalHotKeys>
    );
};
