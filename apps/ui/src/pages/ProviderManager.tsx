import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { Panel } from '../../components/ui/Panel';
import type { RouterOutputs } from '../../utils/trpc';

// Import the provider type directly from tRPC's inferred types
type Provider = RouterOutputs['provider']['list'][number];

// This is the full list of provider types your Volcano SDK supports
const VOLCANO_PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI / Azure / Compatible (OpenRouter, TogetherAI, etc.)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'vertex', label: 'Google Vertex AI (Gemini)' },
  { value: 'mistral', label: 'Mistral (Official API)' },
  { value: 'llama', label: 'Llama (Ollama / Local)' },
  { value: 'bedrock', label: 'AWS Bedrock' },
];

const ProviderManager = () => {
  const [name, setName] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  // Default to 'openai' as it's the most common compatible type
  const [providerType, setProviderType] = useState(VOLCANO_PROVIDER_TYPES[0].value);

  const utils = trpc.useContext();

  // tRPC query to get all configured providers
  const { data: providers, isLoading: isLoadingProviders } = trpc.provider.list.useQuery();

  // tRPC mutation to add a new provider
  const addProvider = trpc.provider.add.useMutation({
    onSuccess: () => {
      // Clear form and refetch provider list
      utils.provider.list.invalidate();
      setName('');
      setBaseURL('');
      setApiKey('');
    },
    onError: (err) => {
      alert(`Error: ${err.message}`);
    },
  });

  // tRPC mutation to fetch models for a provider
  // This uses the "Step 1: Fetch and Store" logic from our new schema
  const fetchModels = trpc.provider.fetchAndNormalizeModels.useMutation({
    onSuccess: (data) => {
      alert(`Successfully upserted ${data.count} models!`);
      // You could invalidate a model list query here
    },
    onError: (err) => {
      alert(`Error fetching models: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProvider.mutate({
      name,
      providerType,
      baseURL,
      apiKey,
    });
  };

  return (
    <div className="flex h-screen flex-col gap-4 bg-neutral-900 p-4 text-neutral-100">
      <h1 className="text-xl font-bold text-neon-cyan">Provider Manager</h1>
      <p className="text-sm text-neutral-400">Add, configure, and update models from your LLM providers.</p>

      <div className="flex flex-grow gap-4 overflow-hidden">
        {/* Left: Add New Provider */}
        <div className="w-1/2 flex-shrink-0">
          <Panel borderColor="border-green-400">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
              <div className="p-2 font-bold border-b border-neutral-800">Add New Provider</div>
              
              <div>
                <label className="text-sm font-semibold text-neutral-300">Provider Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Local Ollama"
                  className="w-full bg-neutral-800 p-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-300">Provider Type</label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                  className="w-full bg-neutral-800 p-2 rounded mt-1"
                >
                  {VOLCANO_PROVIDER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-300">Base URL</label>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-neutral-800 p-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-300">API Key (leave blank if not required)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-... or v0lcan0-r0cks..."
                  className="w-full bg-neutral-800 p-2 rounded mt-1"
                />
              </div>
              
              <button
                type="submit"
                disabled={addProvider.isPending}
                className="bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {addProvider.isPending ? 'Saving...' : 'Save Provider'}
              </button>
            </form>
          </Panel>
        </div>

        {/* Right: Existing Providers */}
        <div className="w-1/2 flex-shrink-0 flex flex-col">
          <Panel borderColor="border-purple-500" className="flex-grow">
            <div className="p-2 font-bold border-b border-neutral-800">Configured Providers</div>
            <div className="flex flex-col gap-2 p-4 overflow-y-auto">
              {isLoadingProviders && <p>Loading...</p>}
              {providers?.map((provider) => (
                <div key={provider.id} className="flex justify-between items-center bg-neutral-800 p-3 rounded">
                  <div>
                    <div className="font-bold">{provider.name}</div>
                    <div className="text-xs text-neutral-400">{provider.baseURL} ({provider.providerType})</div>
                  </div>
                  <button
                    onClick={() => fetchModels.mutate({ providerId: provider.id })}
                    disabled={fetchModels.isPending && fetchModels.variables?.providerId === provider.id}
                    className="bg-purple-500 hover:bg-purple-400 text-black text-sm font-bold py-1 px-3 rounded disabled:opacity-50"
                  >
                    {fetchModels.isPending && fetchModels.variables?.providerId === provider.id ? 'Fetching...' : 'Fetch Models'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default ProviderManager;