import { useState, useEffect } from 'react';
import axios from 'axios';
import RateLimitManager from './components/RateLimitManager';
import './App.css';

interface Provider {
    id: string;
    displayName: string;
    providerType: string;
    config: {
        apiKey: string;
        baseURL?: string;
    };
    models: any[];
}

interface ProviderType {
    name: string;
}

interface NewProviderState {
    displayName: string;
    providerType: string;
    apiKey: string;
    baseURL: string;
}

function App() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providerTypes, setProviderTypes] = useState<ProviderType[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [newProvider, setNewProvider] = useState<NewProviderState>({
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

    const handleAddProvider = (e: React.FormEvent) => {
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

    const handleDeleteProvider = (id: string) => {
        axios.delete(`/llm/configurations/${id}`)
            .then(() => {
                setProviders(providers.filter(p => p.id !== id));
            })
            .catch(error => {
                console.error('Error deleting provider:', error);
            });
    };

    const handleManageRateLimits = (provider: Provider) => {
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
        </div>
    );
}

export default App;
