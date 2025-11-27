import { Route, Routes } from 'react-router-dom';
// import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id].js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import WorkspaceListPage from './pages/WorkspaceList.js';
import ModelsPage from './pages/admin/models.js';
import DataLake from './pages/DataLake.js';
import RoleCreator from './pages/RoleCreator.js';
import WorkSpace from './pages/WorkSpace.js';
import Planner from './pages/Planner.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  return (
    <FileSystemProvider>
      <div className="App h-screen w-screen overflow-hidden" data-theme="dark">
        <Routes>
          <Route path="/" element={<WorkspaceListPage />} />
          <Route path="/providers" element={<UnifiedProviderPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          {/* <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} /> */}
          <Route path="/workspace/:id" element={<MyWorkspacePage />} />
          <Route path="/data-lake" element={<DataLake />} />
          <Route path="/role-creator" element={<RoleCreator />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/workspace" element={<WorkSpace />} />
          <Route path="/workspace-v2" element={<WorkSpace />} />
        </Routes>
      </div>
    </FileSystemProvider>
  );
}
export default App;
