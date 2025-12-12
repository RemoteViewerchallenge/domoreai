import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import type { TerminalMessage } from '@repo/common/agent';

interface XtermTerminalProps {
  logs: TerminalMessage[];
  workingDirectory?: string;
  onInput: (input: string) => void;
}

export default function XtermTerminal({ logs, workingDirectory, onInput }: XtermTerminalProps) {
  const { theme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1);
  const logsRef = useRef(logs);

  // Keep logsRef in sync
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Helper to format prompt with working directory
  const formatPrompt = useCallback((dir?: string) => {
    if (!dir) return '$ ';
    const shortDir = dir.replace(/^\/home\/[^/]+/, '~');
    return `\x1b[36m${shortDir}\x1b[0m $ `;
  }, []);

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
            background: theme.colors.background || '#09090b',
            foreground: theme.colors.text || '#e4e4e7',
            cursor: theme.colors.primary?.value || '#22d3ee',
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

        // Write initial prompt with working directory
        term.write(formatPrompt(workingDirectory));

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
  }, [onInput, processLogs, formatPrompt, workingDirectory]);

  // Update prompt when working directory changes
  useEffect(() => {
    if (xtermRef.current && workingDirectory) {
      xtermRef.current.write(`\r\n${formatPrompt(workingDirectory)}`);
    }
  }, [workingDirectory, formatPrompt]);

  // Process new logs
  useEffect(() => {
    processLogs();
  }, [logs, processLogs]);

  return <div className="h-full w-full overflow-hidden bg-[var(--color-background)] text-left" ref={terminalRef} />;
}
