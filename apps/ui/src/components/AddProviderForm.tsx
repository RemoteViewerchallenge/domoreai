import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';

const PROVIDER_TYPES = [
  { label: 'OpenAI / OpenRouter / Generic', value: 'openai' },
  { label: 'Anthropic (Claude)', value: 'anthropic' },
  { label: 'Google AI Studio / Vertex AI', value: 'google' },
  { label: 'Vertex AI (Legacy/Enterprise)', value: 'vertex' },
  { label: 'Ollama (Local)', value: 'ollama' },
  { label: 'Mistral', value: 'mistral' },
  { label: 'Azure OpenAI', value: 'azure' },
  { label: 'AWS Bedrock', value: 'bedrock' },
];

interface AddProviderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  customMutation?: {
    mutate: (data: unknown) => void;
    isLoading: boolean;
    error: { message: string } | null;
  };
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onSuccess, onCancel, customMutation }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    label: '', 
    type: 'openai',
    baseURL: '',
    apiKey: '',
  });

  const mutation = customMutation || trpc.providers.add.useMutation({
    onSuccess: () => {
      onSuccess?.();
      setFormData({ label: '', type: 'openai', baseURL: '', apiKey: '' });
      setIsOpen(false);
    },
  });

  const normalizeOllamaUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (u.pathname.endsWith('/v1')) {
        u.pathname = u.pathname.replace(/\/v1$/, '/');
      }
      return u.origin + (u.pathname === '/' ? '' : u.pathname);
    } catch {
      return url.replace(/\/?v1\/?$/, '').replace(/\/$/, '');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === 'type') {
        if (value === 'ollama') newData.baseURL = 'http://localhost:11434';
        else if (value === 'openai') newData.baseURL = 'https://api.openai.com/v1';
        else if (value === 'google') newData.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        else if (value === 'anthropic') newData.baseURL = 'https://api.anthropic.com/v1';
        else if (value === 'mistral') newData.baseURL = 'https://api.mistral.ai/v1';
        else if (value === 'azure') newData.baseURL = 'https://{resource}.openai.azure.com/';
      }

      if (name === 'baseURL') {
        const looksLikeOllama = /:11434(\/|$)/.test(value);
        if (looksLikeOllama) {
          newData.type = 'ollama';
          newData.apiKey = ''; 
          newData.baseURL = normalizeOllamaUrl(value);
        }
      }

      if (newData.type === 'ollama' && newData.baseURL) {
        newData.baseURL = normalizeOllamaUrl(newData.baseURL);
      }

      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.type === 'ollama') {
      payload.baseURL = normalizeOllamaUrl(payload.baseURL);
    }

    if (customMutation) {
      customMutation.mutate(payload);
    } else {
      mutation.mutate({
        name: payload.label,
        providerType: payload.type,
        baseURL: payload.baseURL,
        apiKey: payload.apiKey
      });
    }
  };

  return (
    <div className="border-b border-gray-700 pb-4 mb-4">
      {!customMutation && (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-xs btn-primary w-full mb-2"
        >
          {isOpen ? 'Cancel' : '+ Add Provider'}
        </button>
      )}

      {(isOpen || customMutation) && (
        <form onSubmit={handleSubmit} className="space-y-2 bg-base-200 p-2 rounded">
          <div>
            <label className="label py-0"><span className="label-text text-xs">Name</span></label>
            <input
              className="input input-xs input-bordered w-full"
              name="label"
              type="text"
              placeholder="My Provider"
              value={formData.label}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label py-0"><span className="label-text text-xs">Type</span></label>
            <select
              className="select select-xs select-bordered w-full"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              {PROVIDER_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
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
              <option value="http://192.168.1.10:11434">Ollama (LAN IP example)</option>
              <option value="https://api.openai.com/v1">OpenAI</option>
              <option value="https://openrouter.ai/api/v1">OpenRouter</option>
              <option value="https://generativelanguage.googleapis.com/v1beta">Google AI Studio</option>
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
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? 'Saving...' : 'Save'}
          </button>
          
          {onCancel && (
             <button
               type="button"
               onClick={onCancel}
               className="btn btn-xs btn-ghost w-full mt-1"
             >
               Cancel
             </button>
          )}
          
          {mutation.error && (
            <p className="text-error text-xs mt-1">{mutation.error.message}</p>
          )}
        </form>
      )}
    </div>
  );
};
