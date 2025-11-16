import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx("div", { className: "App", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(WorkspaceListPage, {}) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(MyWorkspacePage, {}) }), _jsx(Route, { path: "/providers", element: _jsx(ProviderManagerPage, {}) })] }) }));
}
export default App;
