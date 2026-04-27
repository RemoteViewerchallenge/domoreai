import React, { useCallback, useState, useRef } from 'react';
import { cn } from '../lib/utils.js';
import { ZapIcon } from 'lucide-react';
import ArbitrageCanvas from '../components/ArbitrageCanvas.js';
import { trpc } from '../utils/trpc.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js'; // Corrected extension if needed, but .js usually works for both
import { Button } from '../components/ui/button.js';

const ArbitrageFactory: React.FC = () => {
  const { data: providers } = trpc.providers.list.useQuery();
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const reactFlowInstanceRef = useRef<any>(null);

  // Placeholder mutation for Phase 4
  const saveSuccessfulCallMutation = {
    mutateAsync: async (data: any) => {
      console.log('Simulating saving mapping:', data);
      return { success: true };
    }
  };

  return (
    <div
      className={cn(
        'h-screen w-screen flex flex-col font-mono text-[10pt]',
        'bg-[var(--color-background)] text-white'
      )}
      style={{ fontFamily: 'Fira Code, monospace' }}
    >
      <header
        className={cn(
          'h-14 flex items-center px-4 border-b',
          'bg-[var(--color-background-secondary)] border-[var(--color-border)]'
        )}
      >
        <ZapIcon className="w-6 h-6 mr-2 text-cyan-400" />
        <h1 className="font-bold flex-1">ARBITRAGE FACTORY</h1>

        <SuperAiButton
          contextId="arbitrage_factory_canvas"
          defaultRoleId="api-protocol-architect"
          label="Architect"
          contextGetter={useCallback(() => {
            const canvasState = {
              nodes: reactFlowInstanceRef.current?.getNodes() || [],
              edges: reactFlowInstanceRef.current?.getEdges() || [],
              terminalInput,
              aiSuggestions,
            };
            return JSON.stringify(canvasState, null, 2);
          }, [terminalInput, aiSuggestions])}
          onSuccess={(response) => {
            console.log('AI response:', response);
          }}
        />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'w-64 p-2 overflow-y-auto',
            'bg-[var(--color-background-secondary)] border-r border-[var(--color-border)]'
          )}
        >
          <h2 className="mb-2 text-zinc-400 text-xs uppercase tracking-wider">Available Providers</h2>
          {providers?.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                'p-2 mb-2 cursor-grab rounded-md',
                'bg-[var(--color-background)] border border-[var(--color-border)] hover:bg-[var(--color-background-secondary)] transition-all'
              )}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({ type: 'source', provider }));
              }}
            >
              <span className="text-zinc-100 font-medium">{provider.name}</span>
            </div>
          ))}
        </aside>

        <ArbitrageCanvas reactFlowInstanceRef={reactFlowInstanceRef} />
      </div>

      <div
        className={cn(
          'flex-none h-24 border-t p-4 flex flex-col gap-2',
          'bg-[var(--color-background-secondary)] border-[var(--color-border)]'
        )}
      >
        {aiSuggestions.length > 0 && (
          <div className="flex gap-2 text-xs text-zinc-400">
            AI Suggestions:
            {aiSuggestions.map((suggestion, index) => (
              <span key={index} className="bg-zinc-800 px-2 py-1 rounded-full">
                {suggestion}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            placeholder="Enter AI commands or filters (e.g., is_free === true)..."
            className={cn(
              'flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2',
              'text-zinc-200 text-[10pt] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && terminalInput.trim() !== '') {
                setAiSuggestions((prev) => [...prev, terminalInput]);
                setTerminalInput('');
              }
            }}
          />
          <Button
            onClick={() => {
              const currentGraphState = reactFlowInstanceRef.current
                ? reactFlowInstanceRef.current.toObject()
                : { nodes: [], edges: [] };

              const activeFilters = aiSuggestions.filter(s => s.includes('==='));
              console.log('Executing Mapping...', { currentGraphState, activeFilters });

              saveSuccessfulCallMutation.mutateAsync({
                protocolName: 'ExecutedArbitrageMapping',
                mappingData: currentGraphState,
                filters: activeFilters,
              });

              alert('Mapping execution triggered!');
            }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
          >
            Execute Mapping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArbitrageFactory;
