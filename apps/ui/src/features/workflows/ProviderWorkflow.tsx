import React, { useState } from 'react';
// Make sure these paths match your folder structure. 
// If SmartBrowser is in components/, this path is correct.
import { SmartBrowser } from '../../components/SmartBrowser.js';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';

// The dense, zero-waste provider card
const DenseProviderCard = () => {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className={`flex flex-col w-full h-full bg-background p-3 transition-opacity ${!isActive ? 'opacity-50 grayscale' : ''}`}>
      <div className="flex justify-between items-center h-8 mb-3 border-b border-border pb-2">
        <span className="text-xs font-bold text-primary tracking-wider">PROVIDER ARBITRAGE</span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">{isActive ? 'Live' : 'Offline'}</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-75 m-0" />
        </div>
      </div>

      <div className="space-y-2 flex-grow">
        <Input placeholder="Provider Name (e.g. OpenRouter)" className="h-7 text-[11px] bg-muted/20 border-border" />
        <Input placeholder="Base API URL..." className="h-7 text-[11px] bg-muted/20 border-border" />
        <Input type="password" placeholder="sk-API-Key..." className="h-7 text-[11px] font-mono bg-muted/20 border-border" />
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
        <div className="flex space-x-2 text-[10px] font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          <span>LLM: 0</span><span className="opacity-50">|</span>
          <span>EMB: 0</span><span className="opacity-50">|</span>
          <span>IMG: 0</span>
        </div>
        <SuperAiButton label="Fetch Models" intent="mutation" className="h-7 text-[11px] px-3" />
      </div>
    </div>
  );
};

// The strict 2-column layout that completely ignores the old workspace/screenspace logic
export const ProviderWorkflow: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-2 w-full h-full p-2 bg-background overflow-hidden">
      
      {/* Left Column: The Provider Form & Future Table */}
      <div className="flex flex-col h-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <DenseProviderCard />
        
        <div className="flex-grow p-3 bg-muted/10 border-t border-border flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono">Models table will render here...</span>
        </div>
      </div>

   {/* Right Column: The Agentic Browser */}
      <div className="flex flex-col h-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <SmartBrowser initialUrl="https://duckduckgo.com" />
      </div>

    </div>
  );
};