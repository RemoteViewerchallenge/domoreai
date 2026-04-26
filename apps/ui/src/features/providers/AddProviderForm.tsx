import React, { useState } from 'react';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { Switch } from '../../components/ui/switch.js';
import { Eye, EyeOff } from 'lucide-react';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';

interface AddProviderFormProps {
  onSuccessMorph: (providerId: string, fetchedModels: any[]) => void;
  onCancel: () => void;
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onSuccessMorph, onCancel }) => {
  const [showKey, setShowKey] = useState(false);
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const validateMutation = trpc.providers.validateKey.useMutation();
  const upsertMutation = trpc.providers.upsert.useMutation();

  const handleValidateAndMorph = async () => {
    if (!name || !apiKey) {
      toast.error('Please provide a name and API key');
      return;
    }

    // Determine Base URL if empty
    let finalBaseUrl = baseUrl;
    if (!finalBaseUrl) {
      if (providerType === 'openrouter') finalBaseUrl = 'https://openrouter.ai/api/v1';
      else if (providerType === 'groq') finalBaseUrl = 'https://api.groq.com/openai/v1';
      else if (providerType === 'mistral') finalBaseUrl = 'https://api.mistral.ai/v1';
      else if (providerType === 'anthropic') finalBaseUrl = 'https://api.anthropic.com/v1';
      else if (providerType === 'google') finalBaseUrl = 'https://generativelanguage.googleapis.com';
    }

    try {
      // 1. Validate
      const { models } = await validateMutation.mutateAsync({
        providerType,
        baseUrl: finalBaseUrl,
        apiKey
      });

      // 2. Save to DB
      const provider = await upsertMutation.mutateAsync({
        name,
        providerType,
        baseUrl: finalBaseUrl,
        apiKey,
        isEnabled
      });

      toast.success('Provider validated and saved!');
      onSuccessMorph(provider.id, models);
    } catch (err: any) {
      toast.error('Validation Failed', {
        description: err.message
      });
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6 w-full h-full bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Add New Provider</h2>
        <div className="flex items-center space-x-3">
          <Label htmlFor="provider-active" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Active</Label>
          <Switch id="provider-active" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-grow">
        <div className="space-y-2">
          <Label htmlFor="provider-name" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Provider Name</Label>
          <Input 
            id="provider-name" 
            placeholder="e.g. My Personal OpenAI" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border-zinc-800 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-type" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Service Type</Label>
          <select 
            id="provider-type"
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google Gemini</option>
            <option value="openrouter">OpenRouter (Aggregator)</option>
            <option value="groq">Groq</option>
            <option value="mistral">Mistral</option>
            <option value="generic-openai">Generic OpenAI Compatible</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base-url" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Base API URL</Label>
          <Input 
            id="base-url" 
            placeholder="Drag URL from Smart Browser here..." 
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full bg-zinc-900 border-zinc-800 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const url = e.dataTransfer.getData('text/plain');
              if (url) setBaseUrl(url);
            }}
          />
          <p className="text-[10px] text-zinc-500">Drag from browser or leave blank for official endpoints.</p>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="api-key" className="text-xs font-bold uppercase tracking-widest text-zinc-500">API Key</Label>
          <div className="relative">
            <Input 
              id="api-key" 
              type={showKey ? "text" : "password"} 
              placeholder="sk-..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full pr-12 bg-zinc-900 border-zinc-800 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono"
            />
            <button 
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Keys are encrypted at rest. We won't judge your compute spend.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 mt-auto border-t border-zinc-800">
        <button 
          onClick={onCancel}
          className="text-sm font-bold text-zinc-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <SuperAiButton 
          onClick={handleValidateAndMorph}
          label="Validate Key & Fetch Models"
          intent="mutation"
          isLoading={validateMutation.isLoading || upsertMutation.isLoading}
        />
      </div>
    </div>
  );
};
