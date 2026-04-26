/**
 * Provider Workflow — Phase 3
 *
 * 2-column layout:
 *   Left:  Provider Registry / Financial Arbitrage Dashboard (ProviderManagementGrid)
 *          with enable toggle, SuperAiButton, billing URL DnD dropzone, and card morph
 *   Right: SmartBrowser for navigating to billing dashboards
 *
 * The left column is wrapped in a UniversalCardWrapper (flip-card with settings back).
 * The right column is a bare SmartBrowser card — the URL can be dragged onto a Provider card.
 */
import React, { useState } from 'react';
import { ShieldCheck, Globe } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import { ProviderManagementGrid } from '../providers/ProviderManagementGrid.js';
import { SmartBrowser } from '../../components/SmartBrowser.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

// Shared drag context: right column browser exports its current URL for DnD
export const ProviderWorkflowContext = React.createContext<{
  draggingUrl: string | null;
  setDraggingUrl: (url: string | null) => void;
}>({ draggingUrl: null, setDraggingUrl: () => {} });

export default function ProviderWorkflow() {
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState('https://openrouter.ai/settings/credits');
  const columns = useWorkspaceStore(s => s.columns);

  return (
    <ProviderWorkflowContext.Provider value={{ draggingUrl, setDraggingUrl }}>
      <div className="h-full w-full flex overflow-hidden bg-zinc-950">

        {/* LEFT: Provider Registry */}
        <div
          className="flex flex-col overflow-hidden border-r border-zinc-800"
          style={{ flex: columns > 2 ? '2' : '1' }}
        >
          <UniversalCardWrapper
            title="Provider & Billing Arbitrage"
            icon={ShieldCheck}
            aiContext="provider_workflow"
            settings={
              <div className="text-xs text-zinc-400 space-y-2">
                <p>Configure global provider defaults and guardrails here.</p>
                <p className="text-zinc-500">Individual provider settings are available by clicking Edit on each card.</p>
              </div>
            }
          >
            <ProviderManagementGrid workflowMode />
          </UniversalCardWrapper>
        </div>

        {/* RIGHT: Smart Browser for billing dashboards */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <UniversalCardWrapper
            title="Billing Browser"
            icon={Globe}
            aiContext="provider_billing_browser"
            hideAiButton
            settings={
              <div className="text-xs text-zinc-400 space-y-2">
                <p>Navigate to a provider billing dashboard, then drag the URL onto a Provider card to link it.</p>
              </div>
            }
          >
            {/* Draggable URL badge */}
            <div className="flex-none px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Current URL</span>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', browserUrl);
                  e.dataTransfer.setData('application/x-billing-url', browserUrl);
                  setDraggingUrl(browserUrl);
                }}
                onDragEnd={() => setDraggingUrl(null)}
                className="flex-1 min-w-0 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono text-zinc-300 cursor-grab active:cursor-grabbing truncate hover:border-indigo-500 transition-colors"
                title="Drag this URL onto a Provider card to set its Billing Dashboard URL"
              >
                {browserUrl}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <SmartBrowser
                cardId="provider-workflow-browser"
                screenspaceId={1}
                url={browserUrl}
                onUrlChange={setBrowserUrl}
              />
            </div>
          </UniversalCardWrapper>
        </div>

      </div>
    </ProviderWorkflowContext.Provider>
  );
}
