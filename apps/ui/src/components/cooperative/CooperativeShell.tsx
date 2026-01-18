import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { injectCssVariables } from '../../design-system/cssVariables.js';
import AgentWorkbench from '../../pages/AgentWorkbench.js';
import OrganizationalStructure from '../../pages/OrganizationalStructure.js';
import CodeVisualizer from '../../pages/CodeVisualizer.js';
import DataCenter from '../../pages/DataCenter.js';
import Constitution from '../../pages/Constitution.js';
import VoicePlayground from '../../pages/VoicePlayground.js';
import OrchestrationCanvas from '../../pages/OrchestrationCanvas.js';
import BasetoolPage from '../../pages/BasetoolPage.js';

export function CooperativeShell() {
  // Inject Cooperative Physics on mount
  useEffect(() => {
    injectCssVariables();
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--colors-background)] text-[var(--colors-text)] font-sans">
        <main className="flex-1 relative overflow-hidden flex flex-col">
            <Routes>
                {/* Core OS Routes */}
                <Route path="/" element={<AgentWorkbench />} />
                <Route path="/workbench" element={<AgentWorkbench />} />
                <Route path="/org-structure" element={<OrganizationalStructure />} />
                <Route path="/visualizer" element={<CodeVisualizer />} />
                <Route path="/datacenter" element={<DataCenter />} />
                <Route path="/basetool" element={<BasetoolPage />} />
                <Route path="/settings" element={<Constitution />} />
                <Route path="/voice-playground" element={<VoicePlayground />} />
                <Route path="/orchestration-canvas" element={<OrchestrationCanvas />} />
                
                {/* Legacy or helper redirects */}
                <Route path="/code-visualizer" element={<Navigate to="/visualizer" replace />} />
                
                {/* Fallback */}
                <Route path="*" element={<AgentWorkbench />} />
            </Routes>
        </main>
    </div>
  );
}
