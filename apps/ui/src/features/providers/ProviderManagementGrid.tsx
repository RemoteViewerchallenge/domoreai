import React, { useState, useEffect, useCallback } from 'react';
import { trpc } from '../../utils/trpc.js';
import { 
  AlertCircle,
  Plus, 
  RefreshCw, 
  Trash2, 
  Save,
  Shield,
  Zap,
  Loader2,
  Database
} from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';
import { cn } from '../../lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyEnvVar: string | null;
  pricingUrl: string | null;
  isCreditCardLinked: boolean;
  enforceFreeOnly: boolean;
  monthlyBudget: number | null;
  status: string;
  lastError: string | null;
  isNew?: boolean;
  isDirty?: boolean;
}

export const ProviderManagementGrid: React.FC = () => {
  const utils = trpc.useContext();
  const { data: remoteProviders, isLoading } = trpc.providers.list.useQuery();
  const [localProviders, setLocalProviders] = useState<Provider[]>([]);
  const [showErrorId, setShowErrorId] = useState<string | null>(null);

  // Sync remote data to local state initially and when remote data changes
  useEffect(() => {
    if (remoteProviders) {
      setLocalProviders(remoteProviders.map(p => ({ ...p, isDirty: false })));
    }
  }, [remoteProviders]);

  const upsertMutation = trpc.providers.upsert.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate();
      toast.success('Provider saved successfully');
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });

  const scoutMutation = trpc.providers.scout.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate();
      toast.success('Sync complete. Discovered models updated.');
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    }
  });

  const deleteMutation = trpc.providers.delete.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate();
      toast.success('Provider deleted');
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    }
  });

  const handleUpdate = useCallback((id: string, updates: Partial<Provider>) => {
    setLocalProviders(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, ...updates, isDirty: true };
      }
      return p;
    }));
  }, []);

  const addNewProvider = () => {
    const newId = `new-${Date.now()}`;
    const newProvider: Provider = {
      id: newId,
      name: '',
      type: 'openai', // Default type
      baseUrl: '',
      apiKeyEnvVar: '',
      pricingUrl: '',
      isCreditCardLinked: false,
      enforceFreeOnly: true,
      monthlyBudget: 0,
      status: 'ACTIVE',
      lastError: null,
      isNew: true,
      isDirty: true
    };
    setLocalProviders(prev => [...prev, newProvider]);
  };

  const saveRow = async (provider: Provider) => {
    try {
      await upsertMutation.mutateAsync({
        id: provider.isNew ? undefined : provider.id,
        name: provider.name,
        providerType: provider.type,
        baseUrl: provider.baseUrl || undefined,
        apiKeyEnvVar: provider.apiKeyEnvVar || undefined,
        pricingUrl: provider.pricingUrl || undefined,
        isCreditCardLinked: provider.isCreditCardLinked,
        enforceFreeOnly: provider.enforceFreeOnly,
        monthlyBudget: provider.monthlyBudget || undefined,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveAll = async () => {
    const dirtyOnes = localProviders.filter(p => p.isDirty);
    for (const p of dirtyOnes) {
      await saveRow(p);
    }
  };

  const handleSync = async (provider: Provider) => {
    if (provider.isNew) {
      toast.error('Please save the provider before syncing');
      return;
    }
    
    if (provider.isDirty) {
      // Auto-save before sync to ensure server has latest config
      await saveRow(provider);
    }
    
    scoutMutation.mutate({ providerId: provider.id });
  };

  const hasDirtyState = localProviders.some(p => p.isDirty);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
        <RefreshCw className="animate-spin text-indigo-500" />
        <span className="text-[10px] uppercase font-bold tracking-widest">Hydrating Control Plane...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-zinc-950/50 rounded-xl border border-zinc-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Table Header */}
      <div className="grid grid-cols-[200px_250px_200px_200px_100px_100px_120px_120px_120px] bg-zinc-900/80 border-b border-zinc-800/50 sticky top-0 z-20">
        {[
          'Provider Name', 'Base URL', 'API Key Env Var', 'Pricing/Docs', 
          'CC Linked', 'Free Only', 'Budget ($)', 'Status', 'Actions'
        ].map((header, i) => (
          <div key={i} className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            {header}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-max">
          <AnimatePresence initial={false}>
            {localProviders.map((p) => {
              const isError = p.status === 'ERROR' || p.lastError;
              const isSyncing = scoutMutation.isLoading && scoutMutation.variables?.providerId === p.id;
              
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "grid grid-cols-[200px_250px_200px_200px_100px_100px_120px_120px_120px] items-center border-b border-zinc-800/30 hover:bg-zinc-900/30 transition-colors group",
                    isError && "bg-red-500/5 border-l-2 border-l-red-500"
                  )}
                >
                  {/* Name */}
                  <div className="px-3 py-2">
                    <Input 
                      value={p.name} 
                      onChange={(e) => handleUpdate(p.id, { name: e.target.value })}
                      placeholder="e.g. Anthropic"
                      className="bg-transparent border-transparent hover:border-zinc-700 focus:bg-zinc-900 transition-all text-xs font-medium"
                    />
                  </div>

                  {/* Base URL */}
                  <div className="px-3 py-2">
                    <Input 
                      value={p.baseUrl || ''} 
                      onChange={(e) => handleUpdate(p.id, { baseUrl: e.target.value })}
                      placeholder="https://api.anthropic.com"
                      className="bg-transparent border-transparent hover:border-zinc-700 focus:bg-zinc-900 transition-all text-xs font-mono"
                    />
                  </div>

                  {/* API Key Env Var */}
                  <div className="px-3 py-2">
                    <Input 
                      value={p.apiKeyEnvVar || ''} 
                      onChange={(e) => handleUpdate(p.id, { apiKeyEnvVar: e.target.value })}
                      placeholder="ANTHROPIC_API_KEY"
                      className="bg-transparent border-transparent hover:border-zinc-700 focus:bg-zinc-900 transition-all text-xs font-mono text-emerald-400/80"
                    />
                  </div>

                  {/* Pricing/Docs */}
                  <div className="px-3 py-2">
                    <Input 
                      value={p.pricingUrl || ''} 
                      onChange={(e) => handleUpdate(p.id, { pricingUrl: e.target.value })}
                      placeholder="URL"
                      className="bg-transparent border-transparent hover:border-zinc-700 focus:bg-zinc-900 transition-all text-xs text-indigo-400"
                    />
                  </div>

                  {/* CC Linked */}
                  <div className="px-4 py-2 flex justify-center">
                    <Switch 
                      checked={p.isCreditCardLinked} 
                      onCheckedChange={(checked) => handleUpdate(p.id, { isCreditCardLinked: checked })} 
                    />
                  </div>

                  {/* Free Only */}
                  <div className="px-4 py-2 flex justify-center">
                    <Switch 
                      checked={p.enforceFreeOnly} 
                      onCheckedChange={(checked) => handleUpdate(p.id, { enforceFreeOnly: checked })} 
                    />
                  </div>

                  {/* Monthly Budget */}
                  <div className="px-3 py-2">
                    <Input 
                      type="number"
                      disabled={p.enforceFreeOnly}
                      value={p.monthlyBudget || 0} 
                      onChange={(e) => handleUpdate(p.id, { monthlyBudget: parseFloat(e.target.value) })}
                      className="bg-transparent border-transparent hover:border-zinc-700 focus:bg-zinc-900 transition-all text-xs font-mono text-amber-400 disabled:opacity-30"
                    />
                  </div>

                  {/* Status */}
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Badge 
                      variant={p.status === 'ACTIVE' ? 'default' : 'destructive'}
                      className={cn(
                        "text-[9px] px-1.5 py-0 uppercase font-black tracking-tighter",
                        p.status === 'ACTIVE' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                      )}
                    >
                      {p.status}
                    </Badge>
                    
                    {p.lastError && (
                      <div className="relative">
                        <button 
                          onMouseEnter={() => setShowErrorId(p.id)}
                          onMouseLeave={() => setShowErrorId(null)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <AlertCircle size={14} />
                        </button>
                        
                        {showErrorId === p.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-red-500/50 rounded-lg shadow-2xl z-50 text-[10px] text-red-200 leading-relaxed backdrop-blur-md">
                            <div className="font-bold text-red-400 uppercase mb-1 flex items-center gap-1">
                                <Shield size={10} /> Connectivity Error
                            </div>
                            {p.lastError}
                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-red-500/50 rotate-45" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-2 flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="xs"
                      disabled={isSyncing || p.isNew}
                      onClick={() => handleSync(p)}
                      className={cn(
                        "hover:bg-indigo-500/10 hover:text-indigo-400 transition-all group-hover:opacity-100",
                        isError ? "opacity-100 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30" : "opacity-0",
                        p.isNew && "hidden"
                      )}
                    >
                      {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {(isError || isSyncing) && <span className="ml-1 text-[9px] font-bold uppercase">Sync</span>}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="xs"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                          deleteMutation.mutate({ id: p.id });
                          setLocalProviders(prev => prev.filter(row => row.id !== p.id));
                        }
                      }}
                      className="hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Add Button */}
        <div className="p-4 flex justify-start">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addNewProvider}
            className="border-dashed border-zinc-700 bg-transparent hover:bg-zinc-900/50 text-zinc-400 hover:text-white transition-all gap-2 px-6"
          >
            <Plus size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Add New Provider</span>
          </Button>
        </div>
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {hasDirtyState && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-indigo-600 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.4)] border border-indigo-400/50 flex items-center gap-6 z-30"
          >
            <div className="flex items-center gap-2 text-white">
              <Zap size={16} className="text-amber-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">Unsaved Changes Detected</span>
            </div>
            
            <div className="h-4 w-px bg-indigo-400/30" />
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocalProviders(remoteProviders?.map(p => ({ ...p, isDirty: false })) || [])}
                className="text-white/70 hover:text-white hover:bg-white/10 text-[10px] font-bold uppercase"
              >
                Discard
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveAll}
                disabled={upsertMutation.isLoading}
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold uppercase text-[10px] px-6 shadow-lg gap-2"
              >
                {upsertMutation.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {localProviders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <div className="p-4 bg-zinc-900 rounded-full mb-4 border border-zinc-800">
            <Database size={32} className="text-zinc-700" />
          </div>
          <div className="text-sm font-bold uppercase tracking-widest mb-1">No Providers Configured</div>
          <p className="text-xs text-zinc-500 mb-6">Initialize your AI fleet by adding an LLM provider.</p>
        </div>
      )}
    </div>
  );
};
