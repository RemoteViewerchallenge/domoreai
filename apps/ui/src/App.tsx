import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
import { NewUIRoot } from './components/appearance/NewUIRoot.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { UnifiedLayout } from './components/UnifiedLayout.js';

// New Cooperative OS Pages
import LaunchPad from './pages/LaunchPad.js';
import AgentWorkbench from './pages/AgentWorkbench.js';
import CommandCenter from './pages/CommandCenter.js';
import CodeVisualizer from './pages/CodeVisualizer.js';
import OrganizationalStructure from './pages/OrganizationalStructure.js';
import DataCenter from './pages/DataCenter.js';
import InterfaceStudio from './pages/InterfaceStudio.js';
import Constitution from './pages/Constitution.js';
import ThemeStudio from './pages/ThemeStudio.js';
import NebulaBuilderPage from './pages/nebula-builder.js';

// Sub-routes (if any specific ones remain)
import FileLocationPage from './pages/FileLocationPage.js';

export default function App() {
  return (
    <NewUIRoot>
      <FileSystemProvider>
        <ErrorBoundary>
          <Routes>
            {/* Standalone Routes (No UnifiedLayout) */}
            <Route path="/nebula" element={<NebulaBuilderPage />} />

            {/* Core OS Routes (With UnifiedLayout) */}
            <Route path="/" element={<UnifiedLayout><LaunchPad /></UnifiedLayout>} />
            <Route path="/workbench" element={<UnifiedLayout><AgentWorkbench /></UnifiedLayout>} />
            <Route path="/workbench/:id" element={<UnifiedLayout><AgentWorkbench /></UnifiedLayout>} />
            <Route path="/command" element={<UnifiedLayout><CommandCenter /></UnifiedLayout>} />
            <Route path="/visualizer" element={<UnifiedLayout><CodeVisualizer /></UnifiedLayout>} />
            <Route path="/org-structure" element={<UnifiedLayout><OrganizationalStructure /></UnifiedLayout>} />
            <Route path="/datacenter" element={<UnifiedLayout><DataCenter /></UnifiedLayout>} />
            <Route path="/ui-studio" element={<UnifiedLayout><InterfaceStudio /></UnifiedLayout>} />
            <Route path="/settings" element={<UnifiedLayout><Constitution /></UnifiedLayout>} />
            <Route path="/theme-studio" element={<UnifiedLayout><ThemeStudio /></UnifiedLayout>} />
            <Route path="/setup" element={<UnifiedLayout><FileLocationPage /></UnifiedLayout>} />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </FileSystemProvider>
    </NewUIRoot>
  );
}
