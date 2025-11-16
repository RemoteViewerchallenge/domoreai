import { Routes, Route } from 'react-router-dom';
import MyWorkspacePage from './pages/workspace/[id]';
import ProviderManagerPage from './pages/ProviderManager';
import WorkspaceListPage from './pages/WorkspaceList';
import './App.css';

/**
 * The main application component.
 * It sets up the routing for the entire application.
 * @returns {JSX.Element} The rendered application.
 */
function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<WorkspaceListPage />} />
        <Route path="/workspace/:id" element={<MyWorkspacePage />} />
        <Route path="/providers" element={<ProviderManagerPage />} />
      </Routes>
    </div>
  );
}

export default App;
