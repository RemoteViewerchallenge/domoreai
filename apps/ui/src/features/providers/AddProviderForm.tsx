import React, { useState } from 'react';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';
import { Eye, EyeOff, Server, Box, Cpu, Activity } from 'lucide-react';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';

interface AddProviderFormProps {
  onSuccessMorph: (providerId: string, fetchedModels: any[]) => void;
  onCancel: () => void;
  providerName?: string;
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onSuccessMorph, onCancel, providerName = "New Provider" }) => {
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const validateMutation = trpc.providers.validateKey.useMutation();
  const upsertMutation = trpc.providers.upsert.useMutation();

  // Future: These will be driven by your SQL/AI ingestion workflow
  const mockModelStats = { llm: 14, embedding: 2, voice: 0 };

  const handleFetchModels = async () => {
    if (!apiKey) {
      toast.error('Please provide an API key');
      return;
    }

    // Determine Base URL if empty
    let finalBaseUrl = baseUrl;
    if (!finalBaseUrl) {
      // Assuming providerType is openai for now, adjust as needed
      finalBaseUrl = 'https://api.openai.com/v1';
    }

    try {
      // 1. Validate
      const { models } = await validateMutation.mutateAsync({
        providerType: 'openai', // Adjust
        baseUrl: finalBaseUrl,
        apiKey
      });

      // 2. Save to DB
      const provider = await upsertMutation.mutateAsync({
        name: providerName,
        providerType: 'openai',
        baseUrl: finalBaseUrl,
        apiKey,
        isEnabled: isActive
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
    <div className={`flex flex-col w-full h-full bg-background border border-border rounded-md overflow-hidden transition-opacity ${!isActive ? 'opacity-60' : 'opacity-100'}`}>
      
      {/* Ultra-Compact Top Bar */}
      <div className="flex justify-between items-center px-3 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
          <Server size={14} className="text-primary" />
          <span>{providerName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">{isActive ? 'Active' : 'Offline'}</span>
          <Switch id="provider-active" checked={isActive} onCheckedChange={setIsActive} className="scale-75 data-[state=checked]:bg-primary" />
        </div>
      </div>

      <div className="p-3 space-y-3 flex-grow">
        {/* Condensed Inputs */}
        <div className="space-y-1">
          <Input 
            id="base-url" 
            placeholder="Base API URL..." 
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="h-8 text-xs bg-muted/20 border-border focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="relative space-y-1">
          <Input 
            id="api-key" 
            type={showKey ? "text" : "password"} 
            placeholder="API Key (sk-...)" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-8 text-xs pr-8 font-mono bg-muted/20 border-border focus:ring-1 focus:ring-primary"
          />
          <button 
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* Models Summary (Replacing Broken Billing) */}
        <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/50 text-xs">
          <div className="flex items-center space-x-1 text-muted-foreground"><Cpu size={12}/> <span>LLM: {mockModelStats.llm}</span></div>
          <div className="flex items-center space-x-1 text-muted-foreground"><Box size={12}/> <span>Embed: {mockModelStats.embedding}</span></div>
          <div className="flex items-center space-x-1 text-muted-foreground"><Activity size={12}/> <span>Voice: {mockModelStats.voice}</span></div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-3 py-2 bg-muted/20 border-t border-border flex justify-end">
        <SuperAiButton 
          onClick={handleFetchModels}
          label="Fetch Models"
          intent="mutation"
          size="sm"
          className="h-7 text-xs"
          isLoading={validateMutation.isLoading || upsertMutation.isLoading}
        />
      </div>
    </div>
  );
};
