import { useEffect } from 'react';
import { injectCssVariables } from '../design-system/cssVariables.js';
import AgentWorkbench from '../pages/AgentWorkbench.js';

export function NebulaShell() {
  // Inject Nebula Physics on mount
  useEffect(() => {
    injectCssVariables();
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--colors-background)] text-[var(--colors-text)] font-sans">
        <main className="flex-1 relative overflow-hidden flex flex-col">
            <div className="h-full w-full">
              <AgentWorkbench />
            </div>
        </main>
    </div>
  );
}
