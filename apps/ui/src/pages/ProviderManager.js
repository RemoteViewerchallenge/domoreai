import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Panel } from '@/components/ui/Panel';
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
    // Form state
    const [name, setName] = useState('');
    const [baseURL, setBaseURL] = useState('');
    const [apiKey, setApiKey] = useState('');
    // Default to 'openai' as it's the most common compatible type
    const [providerType, setProviderType] = useState(VOLCANO_PROVIDER_TYPES[0].value);
    const utils = trpc.useUtils();
    // tRPC query to get all configured providers
    const { data: providers, isLoading: isLoadingProviders, error } = trpc.providers.list.useQuery();
    // tRPC mutation to add a new provider
    const addProvider = trpc.providers.add.useMutation({
        onSuccess: () => {
            // Clear form and refetch provider list
            utils.providers.list.invalidate();
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
    const fetchModels = trpc.providers.fetchAndNormalizeModels.useMutation({
        onSuccess: (data) => {
            alert(`Successfully upserted ${data.count} models!`);
            // You could invalidate a model list query here if you had one
        },
        onError: (err) => {
            alert(`Error fetching models: ${err.message}`);
        },
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        addProvider.mutate({
            name,
            providerType,
            baseURL,
            apiKey,
        });
    };
    return (_jsxs("div", { className: "flex h-screen flex-col gap-4 bg-neutral-900 p-4 text-neutral-100", children: [_jsx("h1", { className: "text-xl font-bold text-neon-cyan", children: "Provider Manager" }), _jsx("p", { className: "text-sm text-neutral-400", children: "Add, configure, and update models from your LLM providers." }), _jsxs("div", { className: "flex flex-grow gap-4 overflow-hidden", children: [_jsx("div", { className: "w-1/2 flex-shrink-0", children: _jsx(Panel, { borderColor: "border-green-400", children: _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4 p-4", children: [_jsx("div", { className: "p-2 font-bold border-b border-neutral-800", children: "Add New Provider" }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-neutral-300", children: "Provider Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g., My Local Ollama", className: "w-full bg-neutral-800 p-2 rounded mt-1" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-neutral-300", children: "Provider Type" }), _jsx("select", { value: providerType, onChange: (e) => setProviderType(e.target.value), className: "w-full bg-neutral-800 p-2 rounded mt-1", children: VOLCANO_PROVIDER_TYPES.map((type) => (_jsx("option", { value: type.value, children: type.label }, type.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-neutral-300", children: "Base URL" }), _jsx("input", { type: "text", value: baseURL, onChange: (e) => setBaseURL(e.target.value), placeholder: "http://localhost:11434", className: "w-full bg-neutral-800 p-2 rounded mt-1" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-neutral-300", children: "API Key (leave blank if not required)" }), _jsx("input", { type: "password", value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: "sk-... or v0lcan0-r0cks...", className: "w-full bg-neutral-800 p-2 rounded mt-1" })] }), _jsx("button", { type: "submit", disabled: !name || !baseURL || addProvider.isPending, className: "bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-4 rounded disabled:opacity-50", children: addProvider.isPending ? 'Saving...' : 'Save Provider' })] }) }) }), _jsx("div", { className: "w-1/2 flex-shrink-0 flex flex-col", children: _jsxs(Panel, { borderColor: "border-purple-500", className: "flex-grow", children: [_jsx("div", { className: "p-2 font-bold border-b border-neutral-800", children: "Configured Providers" }), _jsxs("div", { className: "flex flex-col gap-2 p-4 overflow-y-auto", children: [isLoadingProviders && _jsx("p", { children: "Loading..." }), error && (_jsxs("div", { className: "text-red-500", children: [_jsxs("p", { children: ["Error fetching providers: ", error.message] }), _jsx("p", { className: "text-sm text-neutral-400 mt-2", children: "This might be due to a stale server build. Please try restarting the development server." })] })), Array.isArray(providers) && providers.map((provider) => (_jsxs("div", { className: "flex justify-between items-center bg-neutral-800 p-3 rounded", children: [_jsxs("div", { children: [_jsx("div", { className: "font-bold", children: provider.name }), _jsxs("div", { className: "text-xs text-neutral-400", children: [provider.baseURL, " (", provider.providerType, ")"] })] }), _jsx("button", { onClick: () => fetchModels.mutate({ providerId: provider.id }), disabled: fetchModels.isPending, className: "bg-purple-500 hover:bg-purple-400 text-black text-sm font-bold py-1 px-3 rounded disabled:opacity-50", children: fetchModels.isPending && fetchModels.variables?.providerId === provider.id ? 'Fetching...' : 'Fetch Models' })] }, provider.id)))] })] }) })] })] }));
};
export default ProviderManager;
