import { Route, Routes } from 'react-router-dom';
// import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id].js';
import ProviderManagerPage from './pages/ProviderManager.js';
import WorkspaceListPage from './pages/WorkspaceList.js';
import ModelsPage from './pages/admin/models.js';
import './App.css';

/**
 * The main application component that sets up the routing.
 * @returns {JSX.Element} The rendered app with its routes.
 */
function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<WorkspaceListPage />} />
        <Route path="/providers" element={<ProviderManagerPage />} />
        <Route path="/admin/models" element={<ModelsPage />} />
        {/* <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} /> */}
        <Route path="/workspace/:id" element={<MyWorkspacePage />} />
      </Routes>
    </div>
  );
}
export default App;
