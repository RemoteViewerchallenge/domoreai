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

    const handleAddProvider = async (e: React.FormEvent) => {
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
            setNewProvider({ // Reset form fields
                displayName: '',
                providerType: '',
                apiKey: '',
                baseURL: '',
            });
        } catch (error) {
            console.error('Error adding provider:', error);
        }
    };

    const handleDeleteProvider = async (id: string) => { // Added type for id
        try {
            await axios.delete(`${API_BASE_URL}/llm/configurations/${id}`);
            refetchProviders(); // Refetch providers after deleting
        } catch (error) {
            console.error('Error deleting provider:', error);
        }
    };

    const handleManageProvider = (providerId: string) => { // Added type for providerId
        navigate(`/manage/${providerId}`);
    };

    return (
        <div>
            <h1>Provider Manager</h1>
            <Link to="/workspace/default" style={{ display: 'block', margin: '20px 0' }}>Go to Default Workspace &rarr;</Link>
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
                    {providerTypes.map((type: any) => (
                        <option key={type.id} value={type.id}>{type.displayName}</option>
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
                    {providers.map((provider: any) => (
                        <tr key={provider.id}>
                            <td>{provider.displayName}</td>
                            <td>
                                <button onClick={() => handleManageProvider(provider.id)}>Manage Models</button>
                                <button onClick={() => handleDeleteProvider(provider.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export function App() {
    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<ProviderList />} />
                <Route path="/manage/:providerId" element={<RateLimitManagerPage provider={null} onClose={() => { }} />} />
                <Route path="/workspace/:id" element={<MyWorkspacePage />} />
            </Routes>
        </div>
    );
}
export default App;
