import React, { useRef } from 'react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import XtermTerminal from './XtermTerminal.js';
import { Play } from 'lucide-react';

import type { TerminalMessage } from '@repo/common/agent';
import type { Terminal } from 'xterm';

interface SmartTerminalProps {
  logs?: TerminalMessage[];
  workingDirectory?: string;
  onInput?: (input: string) => void;
}

export const SmartTerminal = ({ logs = [], workingDirectory, onInput = () => {} }: SmartTerminalProps) => {
  const termRef = useRef<Terminal | null>(null); // Access to xterm instance

  return (
    <SmartContainer 
      type="TERMINAL" 
      title="System Logs"
      extraActions={<button type="button" title="Run Selection" className="hover:text-[var(--text-primary)] transition-colors"><Play size={10}/></button>}
    >
      {(registerContext) => (
        <XtermTerminal 
          logs={logs}
          workingDirectory={workingDirectory}
          onInput={onInput}
          hideWrapper
          onMount={(term: Terminal) => {
             termRef.current = term;
             registerContext(() => {
                 return (term as any).getBufferLog ? (term as any).getBufferLog() : "Terminal not ready"; 
             });
          }}
        />
      )}
    </SmartContainer>
  );
};
