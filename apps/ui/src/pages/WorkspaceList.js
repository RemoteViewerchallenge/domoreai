import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
/**
 * A simple component to list available workspaces.
 * In a real application, this would be dynamic and fetch data from an API.
 * @returns {JSX.Element} The rendered workspace list.
 */
export default function WorkspaceListPage() {
    return (_jsxs("div", { children: [_jsx("h1", { children: "Workspaces" }), _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/workspace/default", children: "Default Workspace" }) }), _jsx("li", { children: _jsx(Link, { to: "/providers", children: "Provider Manager" }) })] })] }));
}
