import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom'; // Removed useEffect as it's replaced by useQuery
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import axios from 'axios';
import RateLimitManagerPage from './components/RateLimitManager';
import MyWorkspacePage from './pages/workspace/[id]';
import './App.css';
import React from 'react'; // Explicitly import React for JSX
const API_BASE_URL = 'http://localhost:4000';
function ProviderList() {
    const navigate = useNavigate();
    const [newProvider, setNewProvider] = useState({
        displayName: '',
        providerType: '',
        apiKey: '',
        baseURL: '',
    });
    const { data: providers = [], refetch: refetchProviders } = useQuery({
        queryKey: ['providers'],
        queryFn: () => axios.get(`${API_BASE_URL}/llm/configurations`).then(res => res.data),
    });
    const { data: providerTypes = [] } = useQuery({
        queryKey: ['providerTypes'],
        queryFn: () => axios.get(`${API_BASE_URL}/llm/provider-types`).then(res => res.data),
    });
    const handleAddProvider = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/llm/configurations`, {
                displayName: newProvider.displayName,
                providerType: newProvider.providerType,
                config: {
                    apiKey: newProvider.apiKey,
                    baseURL: newProvider.baseURL,
                },
            });
            refetchProviders(); // Refetch providers after adding a new one
            setNewProvider({
                displayName: '',
                providerType: '',
                apiKey: '',
                baseURL: '',
            });
        }
        catch (error) {
            console.error('Error adding provider:', error);
        }
    };
    const handleDeleteProvider = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/llm/configurations/${id}`);
            refetchProviders(); // Refetch providers after deleting
        }
        catch (error) {
            console.error('Error deleting provider:', error);
        }
    };
    const handleManageProvider = (providerId) => {
        navigate(`/manage/${providerId}`);
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Provider Manager" }), _jsx(Link, { to: "/workspace/default", style: { display: 'block', margin: '20px 0' }, children: "Go to Default Workspace \u2192" }), _jsxs("form", { onSubmit: handleAddProvider, children: [_jsx("input", { type: "text", placeholder: "Display Name", value: newProvider.displayName, onChange: e => setNewProvider({ ...newProvider, displayName: e.target.value }) }), _jsxs("select", { value: newProvider.providerType, onChange: e => setNewProvider({ ...newProvider, providerType: e.target.value }), children: [_jsx("option", { value: "", children: "Select Provider Type" }), providerTypes.map((type) => (_jsx("option", { value: type.id, children: type.displayName }, type.id)))] }), _jsx("input", { type: "text", placeholder: "API Key", value: newProvider.apiKey, onChange: e => setNewProvider({ ...newProvider, apiKey: e.target.value }) }), _jsx("input", { type: "text", placeholder: "Base URL (optional)", value: newProvider.baseURL, onChange: e => setNewProvider({ ...newProvider, baseURL: e.target.value }) }), _jsx("button", { type: "submit", children: "Add Provider" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Provider Name" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: providers.map((provider) => (_jsxs("tr", { children: [_jsx("td", { children: provider.displayName }), _jsxs("td", { children: [_jsx("button", { onClick: () => handleManageProvider(provider.id), children: "Manage Models" }), _jsx("button", { onClick: () => handleDeleteProvider(provider.id), children: "Delete" })] })] }, provider.id))) })] })] }));
}
export function App() {
    return (_jsx("div", { className: "App", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ProviderList, {}) }), _jsx(Route, { path: "/manage/:providerId", element: _jsx(RateLimitManagerPage, { provider: null, onClose: () => { } }) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(MyWorkspacePage, {}) })] }) }));
}
export default App;
