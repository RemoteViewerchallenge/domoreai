import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MyWorkspacePage from './pages/workspace/[id].js';
import SmartSwitch from './pages/workspace/SmartSwitch.js';
import DataCenterPage from './pages/datacenter.js';
import WorkSpace from './pages/WorkSpace.js';
import CreatorFactory from './pages/CreatorStudio.js';
import CreatorPage from './pages/creator.js';
import SettingsPage from './pages/SettingsPage.js';
import FileLocationPage from './pages/FileLocationPage.js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import CorePage from './pages/CorePage.js';
import FutureDataExplorer from './pages/DataExplorer.js';
import SidebarCustomizer from './pages/SidebarCustomizer.js';
import SuperNodeCanvas from './pages/SuperNodeCanvas.js';
import InterfaceBuilderPage from './pages/InterfaceBuilder.js';
import VolcanoBoardroom from './pages/VolcanoBoardroom.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
// FIX: Use NewUIRoot for global theming
import { NewUIRoot } from './components/appearance/NewUIRoot.js';
// import { UnifiedMenuBar } from './components/UnifiedMenuBar.js'; // Replaced by VolcanoNavigation
import { VolcanoNavigation } from './components/VolcanoNavigation.js';
import { useHotkeys } from './hooks/useHotkeys.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

import ExecutiveOffice from './pages/ExecutiveOffice.js';
import NexusPage from './pages/Nexus.js';
import DbBrowserPage from './pages/DbBrowserPage.js';
import WideScreenWorkspace from './pages/adaptive_workspace_ui.js';

interface Hotkey {
  id: string;
  action: string;
  keys: string;
}

const HOTKEYS_STORAGE_KEY = 'core-hotkeys';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);

  // Load hotkeys
  useEffect(() => {
    const stored = localStorage.getItem(HOTKEYS_STORAGE_KEY);
    if (stored) {
      try { setHotkeys(JSON.parse(stored)); } catch { setHotkeys([]); }
    }
  }, []);

  const hotkeyHandlers = {
    'Open Settings': () => navigate('/settings'),
    'Go to Workspace': () => navigate('/workspace'),
    'Go to Creator Studio': () => navigate('/creator'),
  };

  useHotkeys(hotkeys, hotkeyHandlers);

  return (
    // FIX: Wrap everything in NewUIRoot to enforce the Titanium Theme globally
    <NewUIRoot>
      <FileSystemProvider>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
          {/* <UnifiedMenuBar /> */} 
          <ErrorBoundary>
            <VolcanoNavigation>
              <Routes>
                {/* Track 1: Master Plan Routes */}
                <Route path="/" element={<NexusPage />} />
                <Route path="/nexus" element={<NexusPage />} />
                <Route path="/boardroom" element={<VolcanoBoardroom />} />
                <Route path="/office" element={<ExecutiveOffice />} />
                <Route path="/data" element={<FutureDataExplorer />} />
                <Route path="/creator" element={<CreatorPage />} />
                <Route path="/factory" element={<CreatorFactory />} />
                <Route path="/builder" element={<CreatorFactory />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* New Core Components */}
                <Route path="/db-browser" element={<DbBrowserPage />} />
                <Route path="/adaptive" element={<WideScreenWorkspace />} />

                {/* Legacy / Utilities */}
                <Route path="/workspace" element={<WorkSpace />} />
                <Route path="/workspace/engineering" element={<WideScreenWorkspace />} />
                <Route path="/workspace/:id" element={<MyWorkspacePage />} />
                <Route path="/workspace/smart-switch" element={<SmartSwitch />} />
                <Route path="/datacenters" element={<DataCenterPage />} />
                <Route path="/file-location" element={<FileLocationPage />} />
                <Route path="/providers" element={<UnifiedProviderPage />} />
                <Route path="/coore" element={<CorePage />} />
                <Route path="/customizer" element={<SidebarCustomizer />} />
                <Route path="/supernodes" element={<SuperNodeCanvas />} />
                <Route path="/interface-builder" element={<InterfaceBuilderPage />} />
                
                <Route path="*" element={
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4">404</h1>
                      <p>Page not found: {location.pathname}</p>
                    </div>
                  </div>
                } />
              </Routes>
            </VolcanoNavigation>
          </ErrorBoundary>
        </div>
      </FileSystemProvider>
    </NewUIRoot>
  );
}
export default App;
