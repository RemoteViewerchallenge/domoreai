import { Route, Routes } from 'react-router-dom';
import MyWorkspacePage from './pages/workspace/[id].js';
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

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  return (
    <FileSystemProvider>
      <div className="h-screen w-screen bg-black text-zinc-200 flex flex-col overflow-hidden">
        <UnifiedMenuBar />
        <Routes>
          <Route path="/" element={<WorkSpace />} />
          <Route path="/projects" element={<ProjectsDashboard />} />
          <Route path="/providers" element={<UnifiedProviderPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          <Route path="/admin/models" element={<ModelsPage />} />
          {/* <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} /> */}
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
        </Routes>
      </div>
    </FileSystemProvider>
  );
}
export default App;
