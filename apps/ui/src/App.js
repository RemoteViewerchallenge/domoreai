import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Link } from 'react-router-dom';
import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id]';
import './App.css';
// A simple component to list workspaces. In a real app, this would be dynamic.
function WorkspaceList() {
    return (_jsxs("div", { children: [_jsx("h1", { children: "Workspaces" }), _jsx("ul", { children: _jsx("li", { children: _jsx(Link, { to: "/workspace/default", children: "Default Workspace" }) }) })] }));
}
export function App() {
    return (_jsx("div", { className: "App", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(WorkspaceList, {}) }), _jsx(Route, { path: "/manage/:providerId", element: _jsx(RateLimitManagerPage, { provider: null, onClose: () => { } }) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(MyWorkspacePage, {}) })] }) }));
}
export default App;
