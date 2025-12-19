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

// Sub-routes (if any specific ones remain)
import FileLocationPage from './pages/FileLocationPage.js';

export default function App() {
  return (
    <NewUIRoot>
      <FileSystemProvider>
        <ErrorBoundary>
          <UnifiedLayout>
            <Routes>
              {/* Core OS Routes */}
              <Route path="/" element={<LaunchPad />} />
              <Route path="/workbench" element={<AgentWorkbench />} />
              <Route path="/workbench/:id" element={<AgentWorkbench />} />
              <Route path="/command" element={<CommandCenter />} />
              <Route path="/visualizer" element={<CodeVisualizer />} />
              <Route path="/org-structure" element={<OrganizationalStructure />} />
              <Route path="/datacenter" element={<DataCenter />} />
              <Route path="/ui-studio" element={<InterfaceStudio />} />
              <Route path="/settings" element={<Constitution />} />

              {/* System & Legacy Support */}
              <Route path="/setup" element={<FileLocationPage />} />
              
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </UnifiedLayout>
        </ErrorBoundary>
      </FileSystemProvider>
    </NewUIRoot>
  );
}
