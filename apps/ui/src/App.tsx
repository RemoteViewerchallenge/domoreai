import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CreatorStudio from './pages/CreatorStudio.js';
import SettingsPage from './pages/SettingsPage.js';
import FileLocationPage from './pages/FileLocationPage.js';
import DesignSystemSettingsPage from './pages/DesignSystemSettingsPage.js';
import FeatureFlagWrapper from './components/core/FeatureFlagWrapper.js';
import NewUIRoot from '../NUI/Dum/NewUIRoot.js';
import AdaptiveDataExplorer from './legacy/unused/data/DataExplorer.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
import { UnifiedMenuBar } from './components/layout/UnifiedMenuBar.js';
import { ThemeProvider, useThemeContext } from './theme/ThemeProvider.js';
import { useHotkeys } from './hooks/useHotkeys.js';
import { ErrorBoundary } from './components/core/ErrorBoundary.js';

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
  const { theme: _theme } = useThemeContext();
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
          {/* Hide the old menu bar on the new UI page */}
          {location.pathname !== '/dummy' && <UnifiedMenuBar />}
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<FeatureFlagWrapper />} />
              <Route path="/workspace" element={<FeatureFlagWrapper />} />

              {/* Data workbench (was UnifiedProviderPage) */}
              <Route path="/data-explorer" element={<AdaptiveDataExplorer />} />

              {/* Creator Studio */}
              <Route path="/creator" element={<CreatorStudio />} />

              {/* Settings and tools */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/file-location" element={<FileLocationPage />} />

              {/* The new UI sandbox page */}
              <Route path="/dummy" element={<NewUIRoot />} />
              <Route path="/design-system" element={<DesignSystemSettingsPage />} />
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
