import React, { useState } from 'react';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import { Input } from '../components/ui/input.js';
import { Switch } from '../components/ui/switch.js';

export const ProviderHealth: React.FC = () => {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className={`flex flex-col w-full h-full bg-background border border-border p-2 transition-opacity ${!isActive ? 'opacity-50 grayscale' : ''}`}>
      {/* Top Bar */}
      <div className="flex justify-between items-center h-8 mb-2">
        <span className="text-xs font-bold text-primary tracking-wider">PROVIDER CONFIG</span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold">{isActive ? 'Live' : 'Off'}</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-75" />
        </div>
      </div>

      {/* Dense Inputs */}
      <div className="space-y-2 flex-grow">
        <Input placeholder="Provider Name..." className="h-7 text-[11px] bg-muted/20" />
        <Input placeholder="Base API URL..." className="h-7 text-[11px] bg-muted/20" />
        <Input type="password" placeholder="sk-API-Key..." className="h-7 text-[11px] font-mono bg-muted/20" />
      </div>

      {/* Model Stats & Action (Replaces Billing) */}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
        <div className="flex space-x-2 text-[10px] font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          <span>LLM: 0</span><span>|</span><span>EMB: 0</span><span>|</span><span>IMG: 0</span>
        </div>
        <SuperAiButton label="Fetch Models" intent="mutation" className="h-7 text-[11px] px-3" />
      </div>
    </div>
  );
};