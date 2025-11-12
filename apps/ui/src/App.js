import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { logger } from './utils/logger';
import axios from 'axios';
import RateLimitManagerPage from './components/RateLimitManager';
import './App.css';
function ProviderList() {
    const [providers, setProviders] = useState([]);
    const [providerTypes, setProviderTypes] = useState([]);
    const navigate = useNavigate();
    const [newProvider, setNewProvider] = useState({
        displayName: '',
        providerType: '',
        apiKey: '',
        baseURL: '',
    });
    useEffect(() => {
        // Fetch the list of configured providers
        axios.get('/llm/configurations')
            .then(response => {
            setProviders(response.data);
        })
            .catch(error => {
            logger.error('Error fetching providers:', error);
        });
        // Fetch the list of available provider types
        axios.get('/llm/provider-types')
            .then(response => {
            setProviderTypes(response.data);
        })
            .catch(error => {
            logger.error('Error fetching provider types:', error);
        });
    }, []);
    const handleAddProvider = (e) => {
        e.preventDefault();
        axios.post('/llm/configurations', {
            displayName: newProvider.displayName,
            providerType: newProvider.providerType,
            config: {
                apiKey: newProvider.apiKey,
                baseURL: newProvider.baseURL,
            },
        })
            .then(response => {
            setProviders([...providers, response.data]);
            setNewProvider({
                displayName: '',
                providerType: '',
                apiKey: '',
                baseURL: '',
            });
        })
            .catch(error => {
            logger.error('Error adding provider:', error);
        });
    };
    const handleDeleteProvider = (id) => {
        axios.delete(`/llm/configurations/${id}`)
            .then(() => {
            setProviders(providers.filter(p => p.id !== id));
        })
            .catch(error => {
            logger.error('Error deleting provider:', error);
        });
    };
    const handleManageProvider = (providerId) => {
        navigate(`/manage/${providerId}`);
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Provider Manager" }), _jsxs("form", { onSubmit: handleAddProvider, children: [_jsx("input", { type: "text", placeholder: "Display Name", value: newProvider.displayName, onChange: e => setNewProvider({ ...newProvider, displayName: e.target.value }) }), _jsxs("select", { value: newProvider.providerType, onChange: e => setNewProvider({ ...newProvider, providerType: e.target.value }), children: [_jsx("option", { value: "", children: "Select Provider Type" }), providerTypes.map(type => (_jsx("option", { value: type.name, children: type.name }, type.name)))] }), _jsx("input", { type: "text", placeholder: "API Key", value: newProvider.apiKey, onChange: e => setNewProvider({ ...newProvider, apiKey: e.target.value }) }), _jsx("input", { type: "text", placeholder: "Base URL (optional)", value: newProvider.baseURL, onChange: e => setNewProvider({ ...newProvider, baseURL: e.target.value }) }), _jsx("button", { type: "submit", children: "Add Provider" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Provider Name" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: providers.map(provider => (_jsxs("tr", { children: [_jsx("td", { children: provider.displayName }), _jsxs("td", { children: [_jsx("button", { onClick: () => handleManageProvider(provider.id), children: "Manage Models" }), _jsx("button", { onClick: () => handleDeleteProvider(provider.id), children: "Delete" })] })] }, provider.id))) })] })] }));
}
export function App() {
    return (_jsx("div", { className: "App", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ProviderList, {}) }), _jsx(Route, { path: "/manage/:providerId", element: _jsx(RateLimitManagerPage, { provider: null, onClose: () => { } }) })] }) }));
}
export default App;
