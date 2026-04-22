import { useMemo } from 'react';
import type { Model } from '../types/role.js';

interface FilterCriteria {
  minContext: number;
  maxContext: number;
  needsVision: boolean;
  needsReasoning: boolean;
}

export const useModelFilter = (models: Model[] | undefined, criteria: FilterCriteria) => {
  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter((m) => {
        const ctx = m.contextWindow || m.specs?.contextWindow || 0;
        
        // Context Window Filter: filter out if contextWindow < selected min value
        if (ctx < criteria.minContext) return false;
        
        // Also check max if relevant, but the request specifically mentioned < selectedValue
        if (criteria.maxContext > 0 && ctx > criteria.maxContext) return false;

        // Modalities Filter
        const mods = m.modalities || [];
        if (criteria.needsVision && !mods.includes("VISION")) return false;
        if (criteria.needsReasoning && !mods.includes("REASONING")) return false;
        
        return true;
    });
  }, [models, criteria.minContext, criteria.maxContext, criteria.needsVision, criteria.needsReasoning]);

  const breakdown = useMemo(() => {
     const stats: Record<string, { matched: number; total: number }> = {};
     if (!filteredModels) return stats;

     // Calculate totals first (from all models? or just how many matched per provider?)
     // The original logic was: iterate filteredModels, group by provider.
     // But we also want to know *total* available models per provider vs matched.
     // Let's assume the UI wants "Matched vs Total".
     
     // 1. Initialize stats with all models
     models?.forEach(m => {
         const p = m.providerLabel || m.providerId || 'Unknown';
         if(!stats[p]) stats[p] = { matched: 0, total: 0 };
         stats[p].total++;
     });

     // 2. Count matches
     filteredModels.forEach(m => {
         const p = m.providerLabel || m.providerId || 'Unknown';
         if(stats[p]) stats[p].matched++;
     });

     return stats;
  }, [models, filteredModels]);

  const groupedModels = useMemo(() => {
      const groups: Record<string, Model[]> = {};
      filteredModels.forEach(m => {
          const p = m.providerLabel || 'Unknown';
          if(!groups[p]) groups[p] = [];
          groups[p].push(m);
      });
      return groups;
  }, [filteredModels]);

  return { filteredModels, breakdown, groupedModels };
};
