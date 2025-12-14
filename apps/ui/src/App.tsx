import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MyWorkspacePage from './pages/workspace/[id].js';
import SmartSwitch from './pages/workspace/SmartSwitch.js';
import DataCenterPage from './pages/datacenter.js';
import WorkSpace from './pages/WorkSpace.js';
import CreatorStudio from './pages/CreatorStudio.js';
import SettingsPage from './pages/SettingsPage.js';
import FileLocationPage from './pages/FileLocationPage.js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import COORE from './pages/COORE.js';
import FutureDataExplorer from './pages/Dataexplorer.js';
import SidebarCustomizer from './pages/SidebarCustomizer.js';
import SuperNodeCanvas from './pages/SuperNodeCanvas.js';
import InterfaceBuilderPage from './pages/InterfaceBuilder.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
// FIX: Use NewUIRoot for global theming
import { NewUIRoot } from './components/appearance/NewUIRoot.js';
import { UnifiedMenuBar } from './components/UnifiedMenuBar.js';
import { useHotkeys } from './hooks/useHotkeys.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

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
          <UnifiedMenuBar />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<WorkSpace />} />
              <Route path="/datacenters" element={<DataCenterPage />} />
              <Route path="/workspace/:id" element={<MyWorkspacePage />} />
              <Route path="/workspace/smart-switch" element={<SmartSwitch />} />
              <Route path="/creator" element={<CreatorStudio />} />
              <Route path="/workspace" element={<WorkSpace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/file-location" element={<FileLocationPage />} />
              <Route path="/providers" element={<UnifiedProviderPage />} />
              <Route path="/coore" element={<COORE />} />
              <Route path="/data" element={<FutureDataExplorer />} />
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
          </ErrorBoundary>
        </div>
      </FileSystemProvider>
    </NewUIRoot>
  );
}
export default App;
