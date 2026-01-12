import React, { useState, useEffect } from 'react';
import { Activity, Code } from 'lucide-react';
import { injectCssVariables } from '../design-system/cssVariables.js';
import { UnifiedMenuBar } from '../components/UnifiedMenuBar.js';
import { FloatingNavigation } from '../components/FloatingNavigation.js';
import AgentWorkbench from '../pages/AgentWorkbench.js';
import { ThemeManager } from '../components/nebula/ThemeManager.js';

// Define the two supported views
type ViewMode = 'workbench' | 'creator';

export function NebulaShell() {
  const [activeView, setActiveView] = useState<ViewMode>('workbench');

  // Inject Nebula Physics on mount
  useEffect(() => {
    injectCssVariables();
  }, []);

  // Define the Navigation Data (The "Variable" Aspect)
  const navConfig = [
    { 
      label: 'Workbench', 
      icon: Activity, 
      isActive: activeView === 'workbench', 
      action: () => setActiveView('workbench') 
    },
    { 
      label: 'Nebula Creator', 
      icon: Code, 
      isActive: activeView === 'creator', 
      action: () => setActiveView('creator') 
    }
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--colors-background)] text-[var(--colors-text)] font-sans transition-colors duration-300">
      
      {/* 1. Component: UnifiedMenuBar (Controlled by Config) */}
      <UnifiedMenuBar items={navConfig} />

      {/* 2. Container: Main Viewport */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        {/* VIEW A: Agent Workbench */}
        {activeView === 'workbench' && (
          <div className="h-full w-full animate-in fade-in zoom-in-95 duration-300">
            <AgentWorkbench />
          </div>
        )}

        {/* VIEW B: Nebula Creator (ThemeManager) */}
        {activeView === 'creator' && (
          <div className="h-full w-full animate-in fade-in zoom-in-95 duration-300 bg-[var(--colors-background-secondary)]">
             <div className="h-full w-full p-6 max-w-7xl mx-auto">
                <ThemeManager />
             </div>
          </div>
        )}

        {/* 3. Component: Floating Nav (Controlled by Config) */}
        <FloatingNavigation items={navConfig} />
        
      </main>
    </div>
  );
}
