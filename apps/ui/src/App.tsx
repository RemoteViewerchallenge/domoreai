import { Route, Routes } from 'react-router-dom';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';
import { NewUIRoot } from './components/appearance/NewUIRoot.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { UnifiedLayout } from './components/UnifiedLayout.js';

// Pages
import WorkSpace from './pages/WorkSpace.js';
import FocusWorkspace from './pages/FocusWorkspace.js';
import FutureDataExplorer from './pages/DataExplorer.js';
import CreatorFactory from './pages/CreatorStudio.js';
import CorePage from './pages/CorePage.js';
import SettingsPage from './pages/SettingsPage.js';
import DbBrowserPage from './pages/DbBrowserPage.js';

function App() {
  return (
    <NewUIRoot>
      <FileSystemProvider>
        <ErrorBoundary>
          <Routes>
            <Route element={<UnifiedLayout />}>
              <Route path="/" element={<WorkSpace />} />
              <Route path="/workspace/:id" element={<WorkSpace />} />
              <Route path="/focus" element={<FocusWorkspace />} />
              <Route path="/data" element={<FutureDataExplorer />} />
              <Route path="/db" element={<DbBrowserPage />} />
              <Route path="/creator" element={<CreatorFactory />} />
              <Route path="/coore" element={<CorePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* 404 */}
              <Route path="*" element={
                <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p>Page not found</p>
                  </div>
                </div>
              } />
            </Route>
          </Routes>
        </ErrorBoundary>
      </FileSystemProvider>
    </NewUIRoot>
  );
}

export default App;
