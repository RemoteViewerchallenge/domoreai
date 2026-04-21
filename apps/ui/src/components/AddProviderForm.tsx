import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { AlertTriangle, Info, Loader2, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils.js';

interface AddProviderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onSuccess, onCancel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    providerType: 'openai',
    baseURL: '',
    apiKeyEnvVar: '',
    pricingUrl: '',
    isCreditCardLinked: false,
    enforceFreeOnly: true,
    monthlyBudget: 0,
  });

  const upsertMutation = trpc.providers.upsert.useMutation();
  const scoutMutation = trpc.providers.scout.useMutation();

  const [isScouting, setIsScouting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const provider = await upsertMutation.mutateAsync({
        name: formData.name,
        providerType: formData.providerType,
        baseURL: formData.baseURL,
        apiKeyEnvVar: formData.apiKeyEnvVar,
        pricingUrl: formData.pricingUrl,
        isCreditCardLinked: formData.isCreditCardLinked,
        enforceFreeOnly: formData.enforceFreeOnly,
        monthlyBudget: formData.enforceFreeOnly ? 0 : formData.monthlyBudget,
      });

      setIsScouting(true);
      await scoutMutation.mutateAsync({ providerId: provider.id });
      setIsScouting(false);
      
      onSuccess?.();
      setIsOpen(false);
      setFormData({
        name: '',
        providerType: 'openai',
        baseURL: '',
        apiKeyEnvVar: '',
        pricingUrl: '',
        isCreditCardLinked: false,
        enforceFreeOnly: true,
        monthlyBudget: 0,
      });
    } catch (error) {
      console.error('Failed to add provider:', error);
      setIsScouting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      
      // Auto-set baseURL for common types
      if (name === 'providerType') {
        if (value === 'openai') next.baseURL = 'https://api.openai.com/v1';
        if (value === 'anthropic') next.baseURL = 'https://api.anthropic.com/v1';
        if (value === 'google') next.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        if (value === 'ollama') next.baseURL = 'http://localhost:11434';
      }
      
      return next;
    });
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-sm btn-primary gap-2 w-full"
      >
        <Plus size={16} /> Add Provider
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Add New Provider</h3>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">Provider Name</label>
            <input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. OpenRouter"
              className="input input-xs input-bordered w-full bg-zinc-950"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">Type</label>
            <select 
              name="providerType"
              value={formData.providerType}
              onChange={handleChange}
              className="select select-xs select-bordered w-full bg-zinc-950"
            >
              <option value="openai">OpenAI / OpenRouter</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Base URL</label>
          <input 
            name="baseURL"
            value={formData.baseURL}
            onChange={handleChange}
            placeholder="https://api.openai.com/v1"
            className="input input-xs input-bordered w-full bg-zinc-950"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500">API Key Env Var</label>
            <input 
              name="apiKeyEnvVar"
              value={formData.apiKeyEnvVar}
              onChange={handleChange}
              placeholder="OPENROUTER_API_KEY"
              className="input input-xs input-bordered w-full bg-zinc-950 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
              Pricing URL <span className="opacity-50">(Optional)</span>
            </label>
            <input 
              name="pricingUrl"
              value={formData.pricingUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="input input-xs input-bordered w-full bg-zinc-950"
            />
          </div>
        </div>

        <div className="divider my-1 opacity-20"></div>

        <div className="flex items-center justify-between p-2 bg-zinc-950/50 rounded border border-zinc-800/50 group">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input 
                type="checkbox" 
                name="isCreditCardLinked"
                checked={formData.isCreditCardLinked}
                onChange={handleChange}
                className={cn(
                  "checkbox checkbox-xs transition-colors",
                  formData.isCreditCardLinked ? "checkbox-error" : "checkbox-primary"
                )}
              />
              <span className={cn(
                "text-xs font-medium",
                formData.isCreditCardLinked ? "text-error" : "text-zinc-400"
              )}>Credit Card Linked</span>
            </label>
            <div className="tooltip tooltip-right" data-tip="Enable only if billing is verified. Enforces strict zero-spend auditing.">
              <Info size={12} className="text-zinc-600 hover:text-zinc-400 cursor-help" />
            </div>
          </div>
          {formData.isCreditCardLinked && (
            <AlertTriangle size={14} className="text-error animate-pulse" />
          )}
        </div>

        {formData.isCreditCardLinked && (
          <div className="space-y-3 p-2 bg-zinc-900/80 rounded border border-zinc-800 animate-in slide-in-from-left-2 duration-300">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400">Enforce Free Models Only</label>
              <input 
                type="checkbox" 
                name="enforceFreeOnly"
                checked={formData.enforceFreeOnly}
                onChange={handleChange}
                className="toggle toggle-xs toggle-primary"
              />
            </div>

            {!formData.enforceFreeOnly && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Monthly Budget ($)</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                  <input 
                    type="number"
                    name="monthlyBudget"
                    value={formData.monthlyBudget}
                    onChange={handleChange}
                    className="input input-xs input-bordered w-full bg-zinc-950 pl-5"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex gap-2">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-xs btn-ghost flex-1"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={upsertMutation.isLoading || isScouting}
            className={cn(
              "btn btn-xs flex-1 gap-2",
              isScouting ? "btn-warning" : "btn-success"
            )}
          >
            {isScouting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Scouting Provider...
              </>
            ) : upsertMutation.isLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Scout'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProviderForm;
