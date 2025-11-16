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
    return (_jsxs("div", { className: "App", children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(WorkspaceList, {}) }), _jsx(Route, { path: "/manage/:providerId", element: _jsx(RateLimitManagerPage, { provider: null, onClose: () => { } }) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(MyWorkspacePage, {}) }), _jsx(Route, { path: "/providermanager", element: _jsx(ProviderManager, {}) }), " "] }), "======= import React, ", (useState, useEffect), " from 'react'; import axios from 'axios'; import RateLimitManager from './components/RateLimitManager'; import './App.css'; function App() ", , "const [providers, setProviders] = useState([]); const [providerTypes, setProviderTypes] = useState([]); const [selectedProvider, setSelectedProvider] = useState(null); const [newProvider, setNewProvider] = useState(", displayName, ": '', providerType: '', apiKey: '', baseURL: '', }); useEffect(() => ", 
            // Fetch the list of configured providers
            axios.get('/llm/configurations')
                .then(response => {
                setProviders(response.data);
            })
                .catch(error => {
                console.error('Error fetching providers:', error);
            }), "; // Fetch the list of available provider types axios.get('/llm/provider-types') .then(response => ", setProviderTypes(response.data), "; }) .catch(error => ", console.error('Error fetching provider types:', error), "; }); }, []); const handleAddProvider = (e) => ", e.preventDefault(), "; axios.post('/llm/configurations', ", displayName, ": newProvider.displayName, providerType: newProvider.providerType, config: ", apiKey, ": newProvider.apiKey, baseURL: newProvider.baseURL, }, }) .then(response => ", setProviders([...providers, response.data]), "; setNewProvider(", displayName, ": '', providerType: '', apiKey: '', baseURL: '', }); }) .catch(error => ", console.error('Error adding provider:', error), "; }); }; const handleDeleteProvider = (id) => ", axios.delete(`/llm/configurations/${id}`)
                .then(() => {
                setProviders(providers.filter(p => p.id !== id));
            })
                .catch(error => {
                console.error('Error deleting provider:', error);
            }), "; }; const handleManageRateLimits = (provider) => ", setSelectedProvider(provider), "; }; const handleCloseModal = () => ", setSelectedProvider(null), "; }; return (", _jsxs("div", { className: "App", children: [_jsx("h1", { children: "Provider Manager" }), _jsxs("form", { onSubmit: handleAddProvider, children: [_jsx("input", { type: "text", placeholder: "Display Name", value: newProvider.displayName, onChange: e => setNewProvider({ ...newProvider, displayName: e.target.value }) }), _jsxs("select", { value: newProvider.providerType, onChange: e => setNewProvider({ ...newProvider, providerType: e.target.value }), children: [_jsx("option", { value: "", children: "Select Provider Type" }), providerTypes.map(type => (_jsx("option", { value: type.name, children: type.name }, type.name)))] }), _jsx("input", { type: "text", placeholder: "API Key", value: newProvider.apiKey, onChange: e => setNewProvider({ ...newProvider, apiKey: e.target.value }) }), _jsx("input", { type: "text", placeholder: "Base URL (optional)", value: newProvider.baseURL, onChange: e => setNewProvider({ ...newProvider, baseURL: e.target.value }) }), _jsx("button", { type: "submit", children: "Add Provider" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Provider Name" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: providers.map(provider => (_jsxs("tr", { children: [_jsx("td", { children: provider.displayName }), _jsxs("td", { children: [_jsx("button", { onClick: () => handleManageRateLimits(provider), children: "Manage Rate Limits" }), _jsx("button", { onClick: () => handleDeleteProvider(provider.id), children: "Delete" })] })] }, provider.id))) })] }), selectedProvider && (_jsx(RateLimitManager, { provider: selectedProvider, onClose: handleCloseModal })), ">>>>>>> feature-rate-limiter"] }), "); } export default App;"] }));
}
