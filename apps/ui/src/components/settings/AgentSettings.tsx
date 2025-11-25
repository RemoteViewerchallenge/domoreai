import React, { useState } from 'react';
import { Brain, Eye, EyeOff, Zap, Lock, Unlock } from 'lucide-react';
// Assuming these UI components exist or using standard HTML if not
// The prompt implies usage of @/components/ui/... which might map to src/components/ui
// If they don't exist, I'll use standard HTML elements for now to avoid build errors
// and the user can swap them later.
// Actually, I saw 'ui' dir in components list, so I'll try to use them if I can guess the path,
// but to be safe and avoid "module not found" errors without exploring 'ui' dir content deeply,
// I will implement with standard HTML/Tailwind and comments on where to swap.

// Represents the state of a single Card's brain
export interface CardAgentState {
  roleId: string;        // The abstract role (e.g. "Junior Coder")
  modelId: string | null; // The concrete model (e.g. "gpt-4o")
  isLocked: boolean;     // If true, use modelId. If false, use Dynamic Selector.
  
  // Runtime Tweaks (Overrides Role defaults) - All Volcano SDK parameters
  temperature: number;              // 0-2: Controls randomness
  maxTokens: number;                // Maximum tokens to generate
  topP?: number;                    // 0-1: Nucleus sampling
  frequencyPenalty?: number;        // -2 to 2: Reduces token frequency repetition
  presencePenalty?: number;         // -2 to 2: Encourages topic diversity
  stop?: string[];                  // Stop sequences to end generation
  seed?: number;                    // For deterministic outputs
  responseFormat?: 'text' | 'json_object'; // Force JSON output
  
  // NEW: Parameter Safety Feedback
  adjustedParameters?: Record<string, any>;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  capabilities?: {
    vision?: boolean;
    reasoning?: boolean;
    coding?: boolean;
  };
  supportsTools?: boolean;
  isUncensored?: boolean;
  costPer1k?: number;
}

interface AgentSettingsProps {
  config: CardAgentState;
  availableRoles: { id: string; name: string }[]; 
  availableModels: ModelOption[];
  onUpdate: (newConfig: CardAgentState) => void;
}

export const AgentSettings: React.FC<AgentSettingsProps> = ({ config, availableRoles, availableModels, onUpdate }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);

  return (
    <div className="h-full w-full bg-zinc-950 text-zinc-300 flex flex-col font-mono text-xs p-4 space-y-6">
      
      {/* 1. ROLE ASSIGNMENT */}
      <div className="space-y-2">
        <label className="uppercase text-[10px] font-bold text-zinc-500 tracking-widest">Assigned Role</label>
        <select 
          value={config.roleId} 
          onChange={(e) => onUpdate({ ...config, roleId: e.target.value, isLocked: false })}
          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:ring-cyan-500/50 outline-none"
        >
          <option value="" disabled>Select a Role...</option>
          {availableRoles.map(role => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-600">
          Roles define capabilities (Vision, Coding) and context limits.
        </p>
      </div>

      {/* 2. MODEL ALLOCATION (The Blind Test) */}
      <div className="p-3 rounded border border-zinc-800 bg-zinc-900/30 space-y-3">
        <div className="flex items-center justify-between">
           <label className="uppercase text-[10px] font-bold text-zinc-500 flex items-center gap-2">
             <Brain size={12} /> Model Allocation
           </label>
           
           {/* Lock/Unlock Manual Override */}
           <button 
             onClick={() => onUpdate({ ...config, isLocked: !config.isLocked })}
             className={`p-1 rounded hover:bg-zinc-800 ${config.isLocked ? 'text-amber-500' : 'text-green-500'}`}
             title={config.isLocked ? "Manual Override Active" : "Dynamic Allocation Active"}
           >
             {config.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
           </button>
        </div>

        {config.isLocked ? (
          // MANUAL OVERRIDE MODE (Double-Blind / Objective Selection)
          <div className="space-y-2">
              <select 
                value={config.modelId || ''} 
                onChange={(e) => onUpdate({ ...config, modelId: e.target.value })}
                className="w-full bg-black border border-amber-900/30 text-amber-500 rounded p-2 outline-none"
              >
                <option value="" disabled>Select a model...</option>
                {availableModels.map(m => {
                    // Construct the "Blind" label
                    const caps = [];
                    if (m.capabilities?.vision) caps.push('Vision');
                    if (m.capabilities?.reasoning) caps.push('Reasoning');
                    if (m.supportsTools) caps.push('Tools');
                    if (m.isUncensored) caps.push('Uncensored');
                    
                    const label = `${m.name} ${caps.length > 0 ? `[${caps.join(', ')}]` : ''}`;
                    return (
                        <option key={m.id} value={m.id}>
                            {label}
                        </option>
                    );
                })}
              </select>
              <div className="flex flex-wrap gap-1">
                  {/* Visual Key for selected model */}
                  {(() => {
                      const selected = availableModels.find(m => m.id === config.modelId);
                      if (!selected) return null;
                      return (
                          <>
                            {selected.isUncensored && <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 border border-red-900 rounded text-[9px] font-bold flex items-center gap-1">☠️ Uncensored</span>}
                            {selected.capabilities?.reasoning && <span className="px-1.5 py-0.5 bg-purple-900/30 text-purple-400 border border-purple-900 rounded text-[9px] font-bold flex items-center gap-1">🧠 Reasoning</span>}
                            {selected.capabilities?.vision && <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-900 rounded text-[9px] font-bold flex items-center gap-1">👁️ Vision</span>}
                          </>
                      );
                  })()}
              </div>
          </div>
        ) : (
          // DYNAMIC / BLIND MODE
          <div className="flex items-center justify-between bg-black border border-zinc-800 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <Zap size={12} className={isRevealed ? "text-blue-400" : "text-green-500 animate-pulse"} />
              <span className={`font-bold ${isRevealed ? "text-zinc-200" : "text-zinc-500"}`}>
                {isRevealed 
                  ? (availableModels.find(m => m.id === config.modelId)?.name || "Allocating...") 
                  : "Dynamic Free Tier"}
              </span>
            </div>
            
            {/* The Peek Button */}
            <button 
              onClick={() => setIsRevealed(!isRevealed)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Peek at assigned model"
            >
              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* 3. HYPERPARAMETERS (Testing Variables) */}
      <div className="space-y-3 pt-2 border-t border-zinc-900 relative">
        <div className="flex justify-between items-center">
            <h3 className="text-[9px] uppercase text-zinc-600 font-bold">Model Parameters</h3>
            {/* Parameter Adjustment Warning */}
            {config.adjustedParameters && Object.keys(config.adjustedParameters).length > 0 && (
                <button 
                    onClick={() => setShowAdjustmentDetails(!showAdjustmentDetails)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-900/20 border border-yellow-700 text-yellow-500 rounded text-[9px] hover:bg-yellow-900/40 transition-colors"
                >
                    ⚠️ Adjusted
                </button>
            )}
        </div>

        {/* Adjustment Details Modal/Popover */}
        {showAdjustmentDetails && config.adjustedParameters && (
            <div className="absolute top-6 right-0 w-64 bg-zinc-900 border border-yellow-700/50 rounded p-2 shadow-xl z-10">
                <h4 className="text-[10px] font-bold text-yellow-500 mb-1">Auto-Adjusted Parameters</h4>
                <div className="space-y-1">
                    {Object.entries(config.adjustedParameters).map(([key, val]: [string, any]) => (
                        <div key={key} className="text-[9px] border-b border-zinc-800 pb-1 last:border-0">
                            <span className="text-zinc-400 font-bold">{key}:</span> <span className="text-zinc-500">{val.reason}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* Temperature */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Temperature</label>
            <span className="text-[10px] font-mono text-cyan-400">{config.temperature}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mb-2">Controls randomness. Higher = more creative, lower = more focused.</p>
          <input 
            type="range"
            min={0} max={2} step={0.1}
            value={config.temperature}
            onChange={(e) => onUpdate({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Max Tokens */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Max Tokens</label>
            <span className="text-[10px] font-mono text-cyan-400">{config.maxTokens}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mb-2">Maximum tokens to generate. Recommended for all models.</p>
          <input 
            type="range"
            min={256} max={8192} step={256}
            value={config.maxTokens}
            onChange={(e) => onUpdate({ ...config, maxTokens: parseInt(e.target.value) })}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Top P */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Top P</label>
            <span className="text-[10px] font-mono text-cyan-400">{config.topP ?? 1.0}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mb-2">Nucleus sampling - alternative to temperature. Lower = more focused.</p>
          <input 
            type="range"
            min={0} max={1} step={0.05}
            value={config.topP ?? 1.0}
            onChange={(e) => onUpdate({ ...config, topP: parseFloat(e.target.value) })}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Frequency Penalty */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Frequency Penalty</label>
            <span className="text-[10px] font-mono text-cyan-400">{config.frequencyPenalty ?? 0}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mb-2">Reduces repetition based on token frequency. Higher = less repetition.</p>
          <input 
            type="range"
            min={-2} max={2} step={0.1}
            value={config.frequencyPenalty ?? 0}
            onChange={(e) => onUpdate({ ...config, frequencyPenalty: parseFloat(e.target.value) })}
            className="w-full accent-green-500"
          />
        </div>

        {/* Presence Penalty */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Presence Penalty</label>
            <span className="text-[10px] font-mono text-cyan-400">{config.presencePenalty ?? 0}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mb-2">Encourages topic diversity. Higher = more diverse topics.</p>
          <input 
            type="range"
            min={-2} max={2} step={0.1}
            value={config.presencePenalty ?? 0}
            onChange={(e) => onUpdate({ ...config, presencePenalty: parseFloat(e.target.value) })}
            className="w-full accent-amber-500"
          />
        </div>

        {/* Seed */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-zinc-400">Seed (Optional)</label>
            <input
              type="number"
              value={config.seed ?? ''}
              onChange={(e) => onUpdate({ ...config, seed: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Random"
              className="w-24 px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-[10px] text-cyan-400 rounded"
            />
          </div>
          <p className="text-[8px] text-zinc-600">For deterministic outputs. Same seed = same output (if supported).</p>
        </div>

        {/* Response Format */}
        <div>
          <label className="text-[10px] font-bold text-zinc-400 block mb-1">Response Format</label>
          <p className="text-[8px] text-zinc-600 mb-2">Force structured JSON output if needed.</p>
          <select
            value={config.responseFormat ?? 'text'}
            onChange={(e) => onUpdate({ ...config, responseFormat: e.target.value as 'text' | 'json_object' })}
            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 rounded"
          >
            <option value="text">Text (Default)</option>
            <option value="json_object">JSON Object</option>
          </select>
        </div>

        {/* Stop Sequences */}
        <div>
          <label className="text-[10px] font-bold text-zinc-400 block mb-1">Stop Sequences</label>
          <p className="text-[8px] text-zinc-600 mb-2">Comma-separated sequences to stop generation.</p>
          <input
            type="text"
            value={config.stop?.join(', ') ?? ''}
            onChange={(e) => onUpdate({ ...config, stop: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
            placeholder="\\n\\n, END, ---"
            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 rounded"
          />
        </div>
      </div>

    </div>
  );
};
