import { Routes, Route, Link } from 'react-router-dom';
import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id]';
import './App.css';

// A simple component to list workspaces. In a real app, this would be dynamic.
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
