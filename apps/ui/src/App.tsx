import { Route, Routes } from 'react-router-dom';
// import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id].js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import { RawDataExplorer } from './pages/RawDataExplorer.js';
import WorkspaceListPage from './pages/WorkspaceList.js';
import ModelsPage from './pages/admin/models.js';
import './App.css';

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  return (
    <div className="App" data-theme="dark">
      <Routes>
        <Route path="/" element={<WorkspaceListPage />} />
        <Route path="/providers" element={<UnifiedProviderPage />} />
        <Route path="/data-explorer" element={<RawDataExplorer />} />
        <Route path="/admin/models" element={<ModelsPage />} />
        {/* <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} /> */}
        <Route path="/workspace/:id" element={<MyWorkspacePage />} />
      </Routes>
    </div>
  );
}
export default App;
