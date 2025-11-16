<<<<<<< HEAD
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
    return (
        <div>
            <h1>Workspaces</h1>
            <ul>
                <li>
                    <Link to="/workspace/default">Default Workspace</Link>
                </li>
                <li>
                    <Link to="/providermanager">Provider Manager</Link> {/* Added link */}
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
                <Route path="/providermanager" element={<ProviderManager />} /> {/* Added route */}
            </Routes>
=======
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RateLimitManager from './components/RateLimitManager';
import './App.css';

function App() {
    const [providers, setProviders] = useState([]);
    const [providerTypes, setProviderTypes] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
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
                console.error('Error fetching providers:', error);
            });

        // Fetch the list of available provider types
        axios.get('/llm/provider-types')
            .then(response => {
                setProviderTypes(response.data);
            })
            .catch(error => {
                console.error('Error fetching provider types:', error);
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
            console.error('Error adding provider:', error);
        });
    };

    const handleDeleteProvider = (id) => {
        axios.delete(`/llm/configurations/${id}`)
            .then(() => {
                setProviders(providers.filter(p => p.id !== id));
            })
            .catch(error => {
                console.error('Error deleting provider:', error);
            });
    };

    const handleManageRateLimits = (provider) => {
        setSelectedProvider(provider);
    };

    const handleCloseModal = () => {
        setSelectedProvider(null);
    };

    return (
        <div className="App">
            <h1>Provider Manager</h1>
            <form onSubmit={handleAddProvider}>
                <input
                    type="text"
                    placeholder="Display Name"
                    value={newProvider.displayName}
                    onChange={e => setNewProvider({ ...newProvider, displayName: e.target.value })}
                />
                <select
                    value={newProvider.providerType}
                    onChange={e => setNewProvider({ ...newProvider, providerType: e.target.value })}
                >
                    <option value="">Select Provider Type</option>
                    {providerTypes.map(type => (
                        <option key={type.name} value={type.name}>
                            {type.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="API Key"
                    value={newProvider.apiKey}
                    onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="Base URL (optional)"
                    value={newProvider.baseURL}
                    onChange={e => setNewProvider({ ...newProvider, baseURL: e.target.value })}
                />
                <button type="submit">Add Provider</button>
            </form>
            <table>
                <thead>
                    <tr>
                        <th>Provider Name</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {providers.map(provider => (
                        <tr key={provider.id}>
                            <td>{provider.displayName}</td>
                            <td>
                                <button onClick={() => handleManageRateLimits(provider)}>
                                    Manage Rate Limits
                                </button>
                                <button onClick={() => handleDeleteProvider(provider.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {selectedProvider && (
                <RateLimitManager
                    provider={selectedProvider}
                    onClose={handleCloseModal}
                />
            )}
>>>>>>> feature-rate-limiter
        </div>
    );
}

export default App;
