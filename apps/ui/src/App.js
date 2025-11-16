import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Link } from 'react-router-dom';
import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id]';
import ProviderManager from './pages/ProviderManager'; // Import ProviderManager
import './App.css';
/**
 * A simple component to list available workspaces.
 * In a real application, this would be dynamic and fetch data from an API.
 * @returns {JSX.Element} The rendered workspace list.
 */
function WorkspaceList() {
    return (_jsxs("div", { children: [_jsx("h1", { children: "Workspaces" }), _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/workspace/default", children: "Default Workspace" }) }), _jsxs("li", { children: [_jsx(Link, { to: "/providermanager", children: "Provider Manager" }), " "] })] })] }));
}
/**
 * The main application component.
 * It sets up the routing for the entire application.
 * @returns {JSX.Element} The rendered application.
 */
export function App() {
    return (_jsx("div", { className: "App", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(WorkspaceList, {}) }), _jsx(Route, { path: "/manage/:providerId", element: _jsx(RateLimitManagerPage, { provider: null, onClose: () => { } }) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(MyWorkspacePage, {}) }), _jsx(Route, { path: "/providermanager", element: _jsx(ProviderManager, {}) }), " "] }) }));
}
export default App;
