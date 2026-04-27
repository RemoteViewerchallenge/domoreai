import React, { useState } from 'react';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';

interface AddProviderFormProps {
  onSuccessMorph?: (providerId: string, fetchedModels: any[]) => void;
  onCancel?: () => void;
}

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onCancel }) => {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className={`flex flex-col w-full bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-sm transition-opacity ${!isActive ? 'opacity-50 grayscale' : ''}`}>
      {/* Top Bar */}
      <div className="flex justify-between items-center h-8 mb-3 border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-blue-400 tracking-wider">PROVIDER CONFIG</span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">{isActive ? 'Live' : 'Offline'}</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-75 m-0 data-[state=checked]:bg-blue-500" />
        </div>
      </div>

      {/* Dense Inputs */}
      <div className="space-y-3 flex-grow">
        <Input placeholder="Provider Name (e.g. OpenRouter)" className="h-8 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500" />
        <Input placeholder="Base API URL..." className="h-8 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500" />
        <Input type="password" placeholder="sk-API-Key..." className="h-8 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500" />
      </div>

      {/* Model Stats & Action (Replaces Legacy Billing) */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
        <div className="flex space-x-2 text-[10px] font-mono bg-slate-950 px-2 py-1 rounded text-slate-500 border border-slate-800">
          <span>LLM: 0</span><span className="opacity-50">|</span>
          <span>EMB: 0</span><span className="opacity-50">|</span>
          <span>IMG: 0</span>
        </div>
        <div className="flex space-x-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="h-7 text-[10px] px-2 text-slate-400 hover:text-white uppercase font-bold"
            >
              Cancel
            </button>
          )}
          <SuperAiButton label="Fetch Models" intent="mutation" className="h-7 text-[11px] px-3 bg-blue-600 hover:bg-blue-500" />
        </div>
      </div>
    </div>
  );
};
