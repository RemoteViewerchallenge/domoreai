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
        config: {},
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
            config: newProvider.config,
        })
        .then(response => {
            setProviders([...providers, response.data]);
            setNewProvider({
                displayName: '',
                providerType: '',
                config: {},
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

    const selectedProviderType = providerTypes.find(p => p.name === newProvider.providerType);

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
                    onChange={e => setNewProvider({ ...newProvider, providerType: e.target.value, config: {} })}
                >
                    <option value="">Select Provider Type</option>
                    {providerTypes.map(type => (
                        <option key={type.name} value={type.name}>
                            {type.name}
                        </option>
                    ))}
                </select>
                {selectedProviderType && Object.entries(selectedProviderType.configSchema).map(([key, schema]) => (
                    <input
                        key={key}
                        type={schema.type}
                        placeholder={schema.description}
                        required={schema.required}
                        value={newProvider.config[key] || ''}
                        onChange={e => setNewProvider({ ...newProvider, config: { ...newProvider.config, [key]: e.target.value } })}
                    />
                ))}
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
        </div>
    );
}

export default App;
