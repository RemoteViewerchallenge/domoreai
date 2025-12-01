import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import type { TerminalMessage } from '@repo/common/agent';

interface XtermTerminalProps {
  logs: TerminalMessage[];
  onInput: (input: string) => void;
}

export default function XtermTerminal({ logs, onInput }: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1);
  const logsRef = useRef(logs);

  // Keep logsRef in sync
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Helper to process logs - stable reference
  const processLogs = useCallback(() => {
      if (!xtermRef.current) return;

      const currentLogs = logsRef.current;
      // Only process new logs based on index
      for (let i = lastProcessedIndexRef.current + 1; i < currentLogs.length; i++) {
          const log = currentLogs[i];
          const formattedMessage = log.message.replace(/\n/g, '\r\n');
          xtermRef.current.write(formattedMessage);
      }
      
      lastProcessedIndexRef.current = currentLogs.length - 1;
  }, []);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Wait for dimensions before initializing
    const resizeObserver = new ResizeObserver(() => {
        if (!terminalRef.current || terminalRef.current.clientWidth === 0 || terminalRef.current.clientHeight === 0) {
            return;
        }

        // If already initialized, just fit
        if (xtermRef.current && fitAddonRef.current) {
            try {
                fitAddonRef.current.fit();
            } catch (e) {
                console.warn('Xterm fit failed:', e);
            }
            return;
        }

        // Initialize Xterm once we have dimensions
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#e4e4e7', // zinc-200
                cursor: '#22d3ee', // cyan-400
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        try {
            fitAddon.fit();
        } catch (e) {
            console.warn('Initial Xterm fit failed:', e);
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle user input
        term.onData((data) => {
            onInput(data);
        });
        
        // Focus the terminal
        term.focus();
        
        // Process any logs that arrived before init
        processLogs();
    });
    
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      if (xtermRef.current) {
          xtermRef.current.dispose();
          xtermRef.current = null;
          // Reset processed index so if we remount, we re-print logs
          lastProcessedIndexRef.current = -1;
      }
    };
  }, [onInput, processLogs]); 

  // Process new logs
  useEffect(() => {
    processLogs();
  }, [logs, processLogs]);

  return <div className="h-full w-full overflow-hidden bg-zinc-950 text-left" ref={terminalRef} />;
}
