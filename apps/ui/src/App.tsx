import { Route, Routes } from 'react-router-dom';
import MyWorkspacePage from './pages/workspace/[id]';
import ProviderManagerPage from './pages/ProviderManager';
import WorkspaceListPage from './pages/WorkspaceList';
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
        <Route path="/workspace/:id" element={<MyWorkspacePage />} />
      </Routes>
    </div>
  );
}

export default App;
