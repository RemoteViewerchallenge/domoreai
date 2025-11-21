import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';

const ProviderManager: React.FC = () => {
  const { data: providers, isLoading, refetch } = trpc.providers.list.useQuery();
  const addProviderMutation = trpc.providers.add.useMutation({
    onSuccess: () => {
      refetch();
      setFormData({ name: '', providerType: 'openai', baseURL: '', apiKey: '' });
    },
  });

  const deleteProviderMutation = trpc.providers.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const debugFetchMutation = trpc.providers.debugFetch.useMutation({
    onSuccess: () => {
      alert('Raw data ingested successfully! Check the Data Explorer.');
    },
    onError: (error) => {
      alert(`Ingestion failed: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    providerType: 'openai',
    baseURL: '',
    apiKey: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProviderMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // Auto-fill Base URL based on Provider Type
      if (name === 'providerType') {
        if (value === 'ollama') newData.baseURL = 'http://localhost:11434';
        else if (value === 'openai') newData.baseURL = 'https://api.openai.com/v1';
        else if (value === 'openrouter') newData.baseURL = 'https://openrouter.ai/api/v1';
        else if (value === 'vertex-studio') newData.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        else if (value === 'anthropic') newData.baseURL = 'https://api.anthropic.com/v1';
        else if (value === 'mistral') newData.baseURL = 'https://api.mistral.ai/v1';
      }
      
      return newData;
    });
  };

  if (isLoading) return <div>Loading providers...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Provider Manager (v2)</h1>

      {/* Add Provider Form */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Provider</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              name="name"
              type="text"
              placeholder="e.g. My Local Ollama"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="providerType">
              Type
            </label>
            <select
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="providerType"
              name="providerType"
              value={formData.providerType}
              onChange={handleChange}
            >
              <option value="openai">OpenAI Compatible (Standard)</option>
              <option value="openrouter">OpenRouter</option>
              <option value="mistral">Mistral</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="vertex-studio">Vertex AI / Gemini</option>
              <option value="anthropic">Anthropic</option>
              <option value="azure">Azure AI</option>
              <option value="bedrock">AWS Bedrock</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="baseURL">
              Base URL
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="baseURL"
              name="baseURL"
              type="text"
              list="baseUrlOptions"
              placeholder="e.g. http://localhost:11434"
              value={formData.baseURL}
              onChange={handleChange}
              required
            />
            <datalist id="baseUrlOptions">
              <option value="http://localhost:11434">Ollama (Local)</option>
              <option value="https://api.openai.com/v1">OpenAI</option>
              <option value="https://openrouter.ai/api/v1">OpenRouter</option>
              <option value="https://generativelanguage.googleapis.com/v1beta">Vertex AI / Gemini</option>
              <option value="https://api.anthropic.com/v1">Anthropic</option>
              <option value="https://{resource}.openai.azure.com/">Azure AI</option>
              <option value="https://api.mistral.ai/v1">Mistral</option>
              <option value="https://api.groq.com/openai/v1">Groq</option>
              <option value="https://api.deepseek.com/v1">DeepSeek</option>
              <option value="http://localhost:1234/v1">LM Studio</option>
            </datalist>
            <p className="text-gray-500 text-xs italic mt-1">
              Select a standard URL or enter your own.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="apiKey">
              API Key (Optional)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="apiKey"
              name="apiKey"
              type="password"
              placeholder="sk-..."
              value={formData.apiKey}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
              disabled={addProviderMutation.isLoading}
            >
              {addProviderMutation.isLoading ? 'Adding...' : 'Add Provider'}
            </button>
          </div>
          {addProviderMutation.error && (
            <p className="text-red-500 text-xs italic mt-2">{addProviderMutation.error.message}</p>
          )}
        </form>
      </div>

      {/* Provider List */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl font-semibold mb-4">Active Providers</h2>
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Base URL
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {providers?.map((provider) => (
              <tr key={provider.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{provider.name}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight">
                    <span aria-hidden className="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span>
                    <span className="relative">{provider.providerType}</span>
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{provider.baseURL}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button
                    className="text-blue-600 hover:text-blue-900 mr-4"
                    onClick={() => {
                      debugFetchMutation.mutate({ providerId: provider.id });
                    }}
                    disabled={debugFetchMutation.isLoading}
                  >
                    {debugFetchMutation.isLoading ? 'Ingesting...' : 'Ingest Raw Data'}
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this provider?')) {
                        deleteProviderMutation.mutate({ id: provider.id });
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProviderManager;