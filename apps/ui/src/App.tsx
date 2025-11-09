import { useState, useEffect } from 'react';
import axios from 'axios';
import type { LLMProvider } from '@repo/common'; // Import LLMProvider interface
import MonacoEditor from './components/Editor';

const API_BASE_URL = 'http://localhost:4000'; // Assuming API runs on port 4000

interface ConfiguredLLMProvider {
  id: string;
  displayName: string;
  providerType: string; // e.g., 'openai', 'mistral'
  config: Record<string, any>;
  models: any[]; // This will now be an array of model objects
}

type ConfigSchemaValue = {
  type: string;
  required: boolean;
  description: string;
};

function App() {
  const [providerTypes, setProviderTypes] = useState<Omit<LLMProvider, 'id' | 'displayName'>[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<ConfiguredLLMProvider[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // State for adding new configuration
  const [newConfigDisplayName, setNewConfigDisplayName] = useState<string>('');
  const [newConfigProviderType, setNewConfigProviderType] = useState<string>('');
  const [newConfigFields, setNewConfigFields] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchProviderTypes();
    fetchConfiguredProviders();
  }, []);

  const fetchProviderTypes = async () => {
    try {
      const response = await axios.get<Omit<LLMProvider, 'id' | 'displayName'>[]>(`${API_BASE_URL}/llm/provider-types`);
      setProviderTypes(response.data);
      if (response.data.length > 0) {
        setNewConfigProviderType(response.data[0].name);
        initializeNewConfigFields(response.data[0].configSchema);
      }
    } catch (err) {
      console.error('Error fetching provider types:', err);
      setError('Failed to fetch LLM provider types.');
    }
  };

  const fetchConfiguredProviders = async () => {
    try {
      const response = await axios.get<ConfiguredLLMProvider[]>(`${API_BASE_URL}/llm/configurations`);
      setConfiguredProviders(response.data);
    } catch (err) {
      console.error('Error fetching configured providers:', err);
      setError('Failed to fetch configured LLM providers.');
    }
  };

  const initializeNewConfigFields = (schema?: Record<string, any>) => {
    const initialFields: Record<string, any> = {};
    if (schema) {
      for (const key in schema) {
        initialFields[key] = '';
      }
    }
    setNewConfigFields(initialFields);
  };

  const handleNewConfigProviderTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerTypeName = e.target.value;
    setNewConfigProviderType(providerTypeName);
    const selectedType = providerTypes.find(pt => pt.name === providerTypeName);
    initializeNewConfigFields(selectedType?.configSchema);
  };

  const handleNewConfigFieldChange = (key: string, value: string) => {
    setNewConfigFields(prevFields => ({
      ...prevFields,
      [key]: value,
    }));
  };

  const handleAddConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newConfigDisplayName || !newConfigProviderType) {
      setError('Display Name and Provider Type are required.');
      return;
    }

    const selectedType = providerTypes.find(pt => pt.name === newConfigProviderType);
    if (selectedType?.configSchema) {
      for (const key in selectedType.configSchema) {
        if (selectedType.configSchema[key].required && !newConfigFields[key]) {
          setError(`"${selectedType.configSchema[key].description}" is required.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/llm/configurations`, {
        displayName: newConfigDisplayName,
        providerType: newConfigProviderType,
        config: newConfigFields,
      });
      setNewConfigDisplayName('');
      setNewConfigFields({});
      fetchConfiguredProviders(); // Refresh the list
    } catch (err: any) {
      console.error('Error adding configuration:', err);
      // Provide a more detailed error message
      const apiError = err.response?.data?.error || 'Failed to add configuration.';
      const modelError = err.response?.data?.modelError;
      let fullErrorMessage = `Error: ${apiError}`;
      if (modelError) fullErrorMessage += ` (Details: ${modelError})`;
      setError(fullErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (id: string) => {
    setError('');
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/llm/configurations/${id}`);
      fetchConfiguredProviders(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting configuration:', err);
      setError(err.response?.data?.error || 'Failed to delete configuration.');
    }
 finally {
      setLoading(false);
    }
  };

  const handleUpdateModels = async (id: string) => {
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/llm/configurations/${id}/update-models`);
      // Re-fetch to show updated model counts or other data
      fetchConfiguredProviders();
    } catch (err: any) {
      console.error('Error updating models:', err);
      setError(err.response?.data?.error || 'Failed to update models.');
    } finally {
      setLoading(false);
    }
  };

  const currentProviderType = providerTypes.find(pt => pt.name === newConfigProviderType);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>LLM Provider Management</h1>

      <MonacoEditor />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Add New Configuration Section */}
      <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Add New LLM Configuration</h2>
        <form onSubmit={handleAddConfiguration}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="new-config-display-name" style={{ display: 'block', marginBottom: '5px' }}>
              Display Name:
            </label>
            <input
              type="text"
              id="new-config-display-name"
              value={newConfigDisplayName}
              onChange={(e) => setNewConfigDisplayName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="new-config-provider-type" style={{ display: 'block', marginBottom: '5px' }}>
              Provider Type:
            </label>
            <select
              id="new-config-provider-type"
              value={newConfigProviderType}
              onChange={handleNewConfigProviderTypeChange}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              disabled={loading}
            >
              {providerTypes.map(pt => (
                <option key={pt.name} value={pt.name}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          {currentProviderType?.configSchema && (
            <div style={{ marginBottom: '15px', border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
              <h3>Configuration Fields for {currentProviderType.name}</h3>
              {Object.entries(currentProviderType.configSchema).map(([key, schema]: [string, ConfigSchemaValue]) => (
                <div key={key} style={{ marginBottom: '10px' }}>
                  <label htmlFor={`new-config-${key}`} style={{ display: 'block', marginBottom: '5px' }}>
                    {schema.description} {schema.required && <span style={{ color: 'red' }}>*</span>}:
                  </label>
                  <input
                    type={schema.type === 'string' ? 'text' : schema.type}
                    id={`new-config-${key}`}
                    value={newConfigFields[key] || ''}
                    onChange={(e) => handleNewConfigFieldChange(key, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    disabled={loading}
                    required={schema.required}
                  />
                  <small style={{ color: '#6c757d', display: 'block', marginTop: '3px' }}>
                    {schema.description}
                  </small>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            disabled={loading || !newConfigDisplayName || !newConfigProviderType}
          >
            Add Configuration
          </button>
        </form>
      </div>

      {/* Configured Providers List */}
      <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Your Configured Providers</h2>
        {configuredProviders.length === 0 ? (
          <p>No providers configured yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {configuredProviders.map(cp => (
              <li key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span>{cp.displayName} ({cp.providerType}) - {cp.models.length} models</span>
                <div>
                  <button
                    onClick={() => handleUpdateModels(cp.id)}
                    style={{ padding: '5px 10px', marginRight: '10px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Models'}
                  </button>
                  <button
                    onClick={() => handleDeleteConfiguration(cp.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
