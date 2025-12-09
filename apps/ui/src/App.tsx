import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MyWorkspacePage from './pages/workspace/[id].js';
import SmartSwitchPage from './pages/workspace/SmartSwitch.js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import ModelsPage from './pages/admin/models.js';
import DataLake from './pages/DataLake.js';
import RoleCreator from './pages/RoleCreator.js';
import ProjectCreator from './pages/ProjectCreator.js';
import ProjectsDashboard from './pages/ProjectsDashboard.js';
import ProjectPage from './pages/ProjectPage.js';
import WorkSpace from './pages/WorkSpace.js';
import ProviderRecovery from './pages/ProviderRecovery.js';
import CreatorStudio from './pages/CreatorStudio.js';
import SettingsPage from './pages/SettingsPage.js';
import FileLocationPage from './pages/FileLocationPage.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
import { UnifiedMenuBar } from './components/UnifiedMenuBar.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { useHotkeys } from './hooks/useHotkeys.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

interface Hotkey {
  id: string;
  action: string;
  keys: string;
}

const HOTKEYS_STORAGE_KEY = 'core-hotkeys';

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);

  // Debug logging for routing
  useEffect(() => {
    console.log('[App] Route changed to:', location.pathname);
  }, [location]);

  // Load hotkeys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(HOTKEYS_STORAGE_KEY);
    if (stored) {
      try {
        setHotkeys(JSON.parse(stored));
      } catch {
        // Invalid JSON, use empty array
        setHotkeys([]);
      }
    }

    // Listen for hotkey updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HOTKEYS_STORAGE_KEY && e.newValue) {
        try {
          setHotkeys(JSON.parse(e.newValue));
        } catch {
          setHotkeys([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Define handlers for various actions
  const hotkeyHandlers = {
    'Toggle Terminal': () => {
      // Terminal toggle would be handled by workspace components
      console.log('Toggle Terminal hotkey triggered');
    },
    'Command Palette': () => {
      // Could open a command palette modal
      console.log('Command Palette hotkey triggered');
    },
    'Open Settings': () => {
      navigate('/settings');
    },
    'Go to Workspace': () => {
      navigate('/workspace');
    },
    'Go to Projects': () => {
      navigate('/projects');
    },
    'Go to Creator Studio': () => {
      navigate('/creator');
    },
  };

  // Register the hotkeys
  useHotkeys(hotkeys, hotkeyHandlers);

  return (
    <ThemeProvider>
      <FileSystemProvider>
        <div 
          className="h-screen w-screen flex flex-col overflow-hidden" 
          style={{ 
            backgroundColor: 'var(--color-background)', 
            color: 'var(--color-text)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight)',
            lineHeight: 'var(--line-height)',
            letterSpacing: 'var(--letter-spacing)'
          }}
        >
          <UnifiedMenuBar />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<WorkSpace />} />
              <Route path="/smartswitch" element={<SmartSwitchPage />} />
              <Route path="/projects" element={<ProjectsDashboard />} />
              <Route path="/providers" element={<UnifiedProviderPage />} />
              <Route path="/admin/models" element={<ModelsPage />} />
              <Route path="/workspace/:id" element={<MyWorkspacePage />} />
              <Route path="/data-lake" element={<DataLake />} />
              <Route path="/role-creator" element={<RoleCreator />} />
              <Route path="/creator" element={<CreatorStudio />} />
              <Route path="/project-creator" element={<ProjectCreator />} />
              <Route path="/project/:id" element={<ProjectPage />} />
              <Route path="/workspace" element={<WorkSpace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/file-location" element={<FileLocationPage />} />
              <Route path="/provider-recovery" element={<ProviderRecovery />} />
              <Route path="*" element={
                <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
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
    </ThemeProvider>
  );
}
export default App;
