import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';

interface AddProviderFormProps {
  onSuccess: () => void;
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    providerType: 'openai',
    baseURL: '',
    apiKey: '',
  });

  const addProviderMutation = trpc.providers.add.useMutation({
    onSuccess: () => {
      onSuccess();
      setFormData({ name: '', providerType: 'openai', baseURL: '', apiKey: '' });
      setIsOpen(false);
    },
  });

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
        else if (value === 'azure') newData.baseURL = 'https://{resource}.openai.azure.com/';
      }
      
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProviderMutation.mutate(formData);
  };

  return (
    <div className="border-b border-gray-700 pb-4 mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-xs btn-primary w-full mb-2"
      >
        {isOpen ? 'Cancel' : '+ Add Provider'}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-2 bg-base-200 p-2 rounded">
          <div>
            <label className="label py-0"><span className="label-text text-xs">Name</span></label>
            <input
              className="input input-xs input-bordered w-full"
              name="name"
              type="text"
              placeholder="My Provider"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label py-0"><span className="label-text text-xs">Type</span></label>
            <select
              className="select select-xs select-bordered w-full"
              name="providerType"
              value={formData.providerType}
              onChange={handleChange}
            >
              <option value="openai">OpenAI Compatible</option>
              <option value="openrouter">OpenRouter</option>
              <option value="mistral">Mistral</option>
              <option value="ollama">Ollama</option>
              <option value="vertex-studio">Vertex AI</option>
              <option value="anthropic">Anthropic</option>
              <option value="azure">Azure AI</option>
              <option value="bedrock">AWS Bedrock</option>
            </select>
          </div>

          <div>
            <label className="label py-0"><span className="label-text text-xs">Base URL</span></label>
            <input
              className="input input-xs input-bordered w-full"
              name="baseURL"
              type="text"
              list="baseUrlOptions"
              placeholder="https://..."
              value={formData.baseURL}
              onChange={handleChange}
              required
            />
            <datalist id="baseUrlOptions">
              <option value="http://localhost:11434">Ollama (Local)</option>
              <option value="https://api.openai.com/v1">OpenAI</option>
              <option value="https://openrouter.ai/api/v1">OpenRouter</option>
              <option value="https://generativelanguage.googleapis.com/v1beta">Vertex AI</option>
              <option value="https://api.anthropic.com/v1">Anthropic</option>
              <option value="https://api.mistral.ai/v1">Mistral</option>
            </datalist>
          </div>

          <div>
            <label className="label py-0"><span className="label-text text-xs">API Key</span></label>
            <input
              className="input input-xs input-bordered w-full"
              name="apiKey"
              type="password"
              placeholder="sk-..."
              value={formData.apiKey}
              onChange={handleChange}
            />
          </div>

          <button
            className="btn btn-xs btn-success w-full mt-2"
            type="submit"
            disabled={addProviderMutation.isLoading}
          >
            {addProviderMutation.isLoading ? 'Saving...' : 'Save'}
          </button>
          
          {addProviderMutation.error && (
            <p className="text-error text-xs mt-1">{addProviderMutation.error.message}</p>
          )}
        </form>
      )}
    </div>
  );
};
