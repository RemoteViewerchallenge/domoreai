import { Route, Routes } from 'react-router-dom';
// import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id].js';
import UnifiedProviderPage from './pages/UnifiedProviderPage.js';
import WorkspaceListPage from './pages/WorkspaceList.js';
import ModelsPage from './pages/admin/models.js';
import DataLake from './pages/DataLake.js';
import RoleCreator from './pages/RoleCreator.js';
import ProjectCreator from './pages/ProjectCreator.js';
import ProjectsDashboard from './pages/ProjectsDashboard.js';
import ProjectPage from './pages/ProjectPage.js';
import WorkSpace from './pages/WorkSpace.js';
import ProviderRecovery from './pages/ProviderRecovery.js';
import './App.css';

import { FileSystemProvider } from './stores/FileSystemStore.js';

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  return (
    <FileSystemProvider>
      <div className="h-screen w-screen bg-black text-zinc-200 flex flex-col overflow-hidden">
      {/* DEBUG BANNER */}
      <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 text-center">
        v1.0.5 - DEBUG MODE: UI UPDATED AT {new Date().toLocaleTimeString()}
      </div>
        <Routes>
          <Route path="/" element={<ProjectsDashboard />} />
          <Route path="/projects" element={<ProjectsDashboard />} />
          <Route path="/providers" element={<UnifiedProviderPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          {/* <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} /> */}
          <Route path="/workspace/:id" element={<MyWorkspacePage />} />
          <Route path="/data-lake" element={<DataLake />} />
          <Route path="/role-creator" element={<RoleCreator />} />
          <Route path="/project-creator" element={<ProjectCreator />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/workspace" element={<WorkSpace />} />

          <Route path="/workspace-v2" element={<WorkSpace />} />
          <Route path="/provider-recovery" element={<ProviderRecovery />} />
        </Routes>
      </div>
    </FileSystemProvider>
  );
}
export default App;
