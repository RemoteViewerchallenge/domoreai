import { Routes, Route, Link } from 'react-router-dom';
import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id]';
import './App.css';

/**
 * A simple component to list available workspaces.
 * In a real application, this would be dynamic and fetch data from an API.
 * @returns {JSX.Element} The rendered workspace list.
 */
function WorkspaceList() {
    return (
        <div>
            <h1>Workspaces</h1>
            <ul>
                <li>
                    <Link to="/workspace/default">Default Workspace</Link>
                </li>
                {/* In the future, more workspaces would be listed here */}
            </ul>
        </div>
    );
}

/**
 * The main application component.
 * It sets up the routing for the entire application.
 * @returns {JSX.Element} The rendered application.
 */
export function App() {
    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<WorkspaceList />} />
                <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => {}} />} />
                <Route path="/workspace/:id" element={<MyWorkspacePage />} />
            </Routes>
        </div>
    );
}

export default App;
