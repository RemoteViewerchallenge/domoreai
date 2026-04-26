import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import { 
  Plus, 
  Trash2, 
  Save,
  Zap,
  Loader2,
  Database,
  DollarSign,
  Activity,
  Edit2,
  Lock
} from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';
import { cn } from '../../lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SmartBrowser } from '../../components/SmartBrowser.js';

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
  serviceCategories: string[];
  billingRiskLevel: 'ZERO_RISK' | 'PROMO_BURN' | 'CC_ON_FILE';
  promoMonthlyLimit: number | null;
  currentScrapedSpend: number | null;
  billingDashboardUrl: string | null;
  lastScrapeTime: string | null;
  status: string;
  lastError: string | null;
  providerClass: 'FOUNDATIONAL' | 'AGGREGATOR' | 'INFERENCE_ENGINE' | 'LOCAL';
  isNew?: boolean;
  isDirty?: boolean;
}

const RISK_COLORS = {
  ZERO_RISK: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PROMO_BURN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CC_ON_FILE: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const RISK_LABELS = {
  ZERO_RISK: 'ZERO RISK',
  PROMO_BURN: 'PROMO BURN',
  CC_ON_FILE: 'CC ON FILE'
};

export const ProviderManagementGrid: React.FC<{ workflowMode?: boolean }> = ({ workflowMode: _workflowMode = false }) => {
  const utils = trpc.useContext();
  const { data: remoteProviders, isLoading } = trpc.providers.list.useQuery();
  const [localProviders, setLocalProviders] = useState<Provider[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [billingProviderId, setBillingProviderId] = useState<string | null>(null);
  const [billingProviderUrl, setBillingProviderUrl] = useState<string>('');

  useEffect(() => {
    if (remoteProviders) {
      setLocalProviders(remoteProviders.map((p: any) => ({ ...p, isDirty: false })));
    }
  }, [remoteProviders]);

  const upsertMutation = trpc.providers.upsert.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate();
      toast.success('Provider saved successfully');
      setEditingProvider(null);
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });



  const scrapeMutation = trpc.providers.scrapeBalance.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate();
      toast.success('Balance sync complete.');
    },
    onError: (err) => {
      toast.error(`Scrape failed: ${err.message}`);
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

  const openAddModal = () => {
    setEditingProvider({
      id: `new-${Date.now()}`,
      name: '',
      type: 'openai',
      baseUrl: '',
      apiKeyEnvVar: '',
      pricingUrl: '',
      isCreditCardLinked: false,
      enforceFreeOnly: true,
      monthlyBudget: 0,
      serviceCategories: ['LLM'],
      billingRiskLevel: 'ZERO_RISK',
      promoMonthlyLimit: 0,
      currentScrapedSpend: 0,
      billingDashboardUrl: '',
      lastScrapeTime: null,
      status: 'ACTIVE',
      lastError: null,
      providerClass: 'FOUNDATIONAL',
      isNew: true,
      isDirty: true
    });
  };

  const handleSaveModal = async () => {
    if (!editingProvider) return;
    try {
      await upsertMutation.mutateAsync({
        id: editingProvider.isNew ? undefined : editingProvider.id,
        name: editingProvider.name,
        providerType: editingProvider.type,
        baseUrl: editingProvider.baseUrl || undefined,
        apiKeyEnvVar: editingProvider.apiKeyEnvVar || undefined,
        pricingUrl: editingProvider.pricingUrl || undefined,
        isCreditCardLinked: editingProvider.isCreditCardLinked,
        enforceFreeOnly: editingProvider.enforceFreeOnly,
        monthlyBudget: editingProvider.monthlyBudget || undefined,
        serviceCategories: editingProvider.serviceCategories,
        billingRiskLevel: editingProvider.billingRiskLevel,
        promoMonthlyLimit: editingProvider.promoMonthlyLimit || undefined,
        currentScrapedSpend: editingProvider.currentScrapedSpend || undefined,
        billingDashboardUrl: editingProvider.billingDashboardUrl || undefined,
        providerClass: editingProvider.providerClass,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleScrape = (providerId: string) => {
    scrapeMutation.mutate({ providerId });
  };

  const categories = ['ALL', ...Array.from(new Set(localProviders.flatMap(p => p.serviceCategories || [])))];
  
  const filteredProviders = localProviders.filter(p => 
    activeTab === 'ALL' || (p.serviceCategories && p.serviceCategories.includes(activeTab))
  );

  const providersByClass = useMemo(() => {
    const groups: Record<string, Provider[]> = {
      FOUNDATIONAL: [],
      AGGREGATOR: [],
      INFERENCE_ENGINE: [],
      LOCAL: []
    };
    filteredProviders.forEach(p => {
      const cls = p.providerClass || 'FOUNDATIONAL';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(p);
    });
    return groups;
  }, [filteredProviders]);

  const classLabels: Record<string, string> = {
    FOUNDATIONAL: 'Foundational Providers',
    AGGREGATOR: 'API Aggregators & Proxies',
    INFERENCE_ENGINE: 'Inference Engines',
    LOCAL: 'Local Infrastucture'
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-zinc-500 gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-xs uppercase font-bold tracking-widest">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-zinc-950 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Zap className="text-indigo-400" /> Financial & Capability Arbitrage Dashboard
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Maximize free labor and enforce strict financial guardrails.</p>
        </div>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2">
          <Plus size={16} /> Add Provider
        </Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-zinc-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={cn(
              "px-4 py-2 rounded-t-lg text-xs font-bold transition-all uppercase tracking-wider",
              activeTab === cat 
                ? "bg-zinc-800 text-white border-b-2 border-indigo-500" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {(Object.entries(providersByClass) as [keyof typeof classLabels, Provider[]][]).map(([cls, providers]) => {
          if (providers.length === 0) return null;
          
          return (
            <div key={cls} className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">
                  {classLabels[cls]}
                </h2>
                <div className="h-[1px] w-full bg-zinc-800/50" />
                <Badge variant="outline" className="text-[10px] bg-zinc-900/50 text-zinc-400 border-zinc-800">
                  {providers.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {providers.map((provider: Provider) => {
                    const spend = provider.currentScrapedSpend || 0;
                    const limit = provider.promoMonthlyLimit || 1; 
                    const percent = Math.min(100, Math.max(0, (spend / limit) * 100));
                    const isOverLimit = spend >= limit;

                    return (
                      <motion.div
                        key={provider.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-zinc-700 transition-all relative overflow-hidden group"
                      >
                        {/* Health Dot & Risk Level */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                              (provider.status === 'ACTIVE') ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                            )} />
                            <h3 className="text-base font-bold text-white tracking-wide">{provider.name}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={cn("text-[9px] font-black uppercase tracking-wider border", RISK_COLORS[(provider.billingRiskLevel || 'ZERO_RISK') as keyof typeof RISK_COLORS])}>
                              {RISK_LABELS[(provider.billingRiskLevel || 'ZERO_RISK') as keyof typeof RISK_LABELS]}
                            </Badge>
                            {provider.providerClass === 'AGGREGATOR' && (
                              <Badge className="text-[8px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30 uppercase font-black">
                                Multi-Provider Proxy
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-1">
                          {provider.serviceCategories?.map((cat: string) => (
                            <span key={cat} className="text-[9px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase font-semibold">
                              {cat}
                            </span>
                          ))}
                        </div>

                        {/* Spend Progress */}
                        <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-zinc-400 font-mono flex items-center gap-1">
                              <DollarSign size={12} /> Scraped Spend
                            </span>
                            <span className={cn("font-mono font-bold", isOverLimit ? "text-red-400" : "text-emerald-400")}>
                              ${spend.toFixed(2)} / ${limit.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1 overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", isOverLimit ? "bg-red-500" : "bg-emerald-500")}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {provider.lastScrapeTime && (
                            <div className="text-[9px] text-zinc-600 font-mono text-right mt-2">
                              Last checked: {new Date(provider.lastScrapeTime).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 hover:text-white text-zinc-300 gap-1 text-[10px] uppercase font-bold"
                            onClick={() => setEditingProvider(provider)}
                          >
                            <Edit2 size={12} /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setBillingProviderUrl(provider.billingDashboardUrl || `https://console.${provider.type}.com`);
                              setBillingProviderId(provider.id);
                            }}
                            className="bg-zinc-800/50 border-zinc-700 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/50 text-zinc-300 gap-1 text-[10px] uppercase font-bold"
                          >
                            <Lock size={12} /> Connect Billing
                          </Button>
                        </div>
                        
                        {/* Scrape Sync Button (Full width) */}
                        <Button 
                          variant="default"
                          size="sm"
                          disabled={scrapeMutation.isLoading}
                          onClick={() => handleScrape(provider.id)}
                          className="w-full mt-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 gap-2 uppercase tracking-wider text-[10px] font-bold"
                        >
                          {scrapeMutation.isLoading && scrapeMutation.variables?.providerId === provider.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Activity size={12} />
                          )}
                          Force Sync Balance
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {filteredProviders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600 h-full">
            <div className="p-4 bg-zinc-900 rounded-full mb-4 border border-zinc-800">
              <Database size={32} className="text-zinc-700" />
            </div>
            <div className="text-sm font-bold uppercase tracking-widest mb-1">No Providers Configured</div>
            <p className="text-xs text-zinc-500 mb-6">Start capitalizing on free AI labor by adding a provider.</p>
          </div>
        )}
      </div>

      {/* Editing Modal */}
      <AnimatePresence>
        {editingProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur z-10">
                <h2 className="text-lg font-bold text-white">{editingProvider.isNew ? 'Add Provider' : 'Edit Provider'}</h2>
                <button onClick={() => setEditingProvider(null)} className="text-zinc-500 hover:text-white"><Plus className="rotate-45" /></button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 border-b border-zinc-800 pb-2">Core Config</h3>
                  
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Name</label>
                    <Input 
                      value={editingProvider.name} 
                      onChange={e => setEditingProvider({...editingProvider, name: e.target.value})} 
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Provider Type</label>
                    <Input 
                      value={editingProvider.type} 
                      onChange={e => setEditingProvider({...editingProvider, type: e.target.value})} 
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Base URL</label>
                    <Input 
                      value={editingProvider.baseUrl || ''} 
                      onChange={e => setEditingProvider({...editingProvider, baseUrl: e.target.value})} 
                      className="bg-zinc-900 border-zinc-800 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Provider Class</label>
                    <select 
                      value={editingProvider.providerClass}
                      onChange={e => setEditingProvider({...editingProvider, providerClass: e.target.value as any})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="FOUNDATIONAL">Foundational</option>
                      <option value="AGGREGATOR">Aggregator / Proxy</option>
                      <option value="INFERENCE_ENGINE">Inference Engine</option>
                      <option value="LOCAL">Local</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Service Categories (comma separated)</label>
                    <Input 
                      value={editingProvider.serviceCategories?.join(', ')} 
                      onChange={e => setEditingProvider({...editingProvider, serviceCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                      className="bg-zinc-900 border-zinc-800 text-sm"
                      placeholder="LLM, VOICE, VISION"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 border-b border-zinc-800 pb-2">Financial Guardrails</h3>
                  
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Billing Risk Level</label>
                    <select 
                      value={editingProvider.billingRiskLevel}
                      onChange={e => setEditingProvider({...editingProvider, billingRiskLevel: e.target.value as any})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ZERO_RISK">Zero Risk</option>
                      <option value="PROMO_BURN">Promo Burn</option>
                      <option value="CC_ON_FILE">Credit Card On File</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Promo Limit ($)</label>
                      <Input 
                        type="number"
                        value={editingProvider.promoMonthlyLimit || 0} 
                        onChange={e => setEditingProvider({...editingProvider, promoMonthlyLimit: parseFloat(e.target.value)})} 
                        className="bg-zinc-900 border-zinc-800 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Hard Budget ($)</label>
                      <Input 
                        type="number"
                        value={editingProvider.monthlyBudget || 0} 
                        onChange={e => setEditingProvider({...editingProvider, monthlyBudget: parseFloat(e.target.value)})} 
                        className="bg-zinc-900 border-zinc-800 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Billing Dashboard URL</label>
                    <Input 
                      value={editingProvider.billingDashboardUrl || ''} 
                      onChange={e => setEditingProvider({...editingProvider, billingDashboardUrl: e.target.value})} 
                      className="bg-zinc-900 border-zinc-800 text-sm"
                      placeholder="https://console.provider.com/billing"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <span className="text-xs font-bold text-zinc-400">Enforce Free Only</span>
                    <Switch checked={editingProvider.enforceFreeOnly} onCheckedChange={c => setEditingProvider({...editingProvider, enforceFreeOnly: c})} />
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <span className="text-xs font-bold text-zinc-400">Credit Card Linked</span>
                    <Switch checked={editingProvider.isCreditCardLinked} onCheckedChange={c => setEditingProvider({...editingProvider, isCreditCardLinked: c})} />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-between sticky bottom-0 z-10">
                {!editingProvider.isNew ? (
                  <Button 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                    onClick={() => {
                      if (confirm('Delete this provider?')) {
                        deleteMutation.mutate({ id: editingProvider.id });
                        setEditingProvider(null);
                      }
                    }}
                  >
                    <Trash2 size={16} /> Delete
                  </Button>
                ) : <div />}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setEditingProvider(null)}>Cancel</Button>
                  <Button 
                    onClick={handleSaveModal} 
                    disabled={upsertMutation.isLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2"
                  >
                    {upsertMutation.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Configuration
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Billing Browser Modal */}
      <AnimatePresence>
        {billingProviderId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[80vh] shadow-2xl flex flex-col overflow-hidden relative"
            >
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setBillingProviderId(null)} className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors backdrop-blur">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <SmartBrowser 
                cardId="billing-browser"
                screenspaceId={1}
                url={billingProviderUrl}
                billingModeProviderId={billingProviderId}
                onBillingSessionSaved={() => {
                  setBillingProviderId(null);
                  utils.providers.list.invalidate();
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
