import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from '../hooks/useTheme.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import type { TerminalMessage } from '@repo/common/agent';
import { UniversalCardWrapper } from './work-order/UniversalCardWrapper.js';
import { Terminal as TerminalIcon, ArrowRight, Sparkles } from 'lucide-react';

interface XtermTerminalProps {
  logs: TerminalMessage[];
  workingDirectory?: string;
  onInput: (input: string) => void;
  headerEnd?: React.ReactNode;
  onMount?: (term: Terminal) => void;
  hideWrapper?: boolean;
}

export default function XtermTerminal({ logs, workingDirectory, onInput, headerEnd, onMount, hideWrapper }: XtermTerminalProps) {
  const { theme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1);
  const logsRef = useRef(logs);

  // AI Command Generator State
  const [aiRequest, setAiRequest] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
            background: 'transparent', // Transparent to let app theme bleed through
            foreground: theme.colors.text || '#e4e4e7',
            cursor: theme.colors.primary?.value || '#22d3ee',
            selectionBackground: 'rgba(255, 255, 255, 0.3)',
          },
          allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        // Add WebLinks Addon
        term.loadAddon(new WebLinksAddon());

        term.open(terminalRef.current);
        try {
            fitAddon.fit();
        } catch (e) {
            console.warn('Initial Xterm fit failed:', e);
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // @ts-expect-error adding custom helper
        term.getBufferLog = () => {
            const buffer = term.buffer.active;
            let lines = '';
            for (let i = 0; i < buffer.length; i++) {
                const line = buffer.getLine(i);
                if (line) lines += line.translateToString() + '\n';
            }
            return lines;
        };

        if (onMount) onMount(term);

        // Write initial prompt with working directory
        term.write(formatPrompt(workingDirectory));

        // Local Line Buffer state
        let inputBuffer = '';

        // Handle user input with local echo and buffering
        term.onData((data) => {
            const code = data.charCodeAt(0);

            // Enter key (13 for \r)
            if (code === 13) {
                term.write('\r\n');
                if (inputBuffer.trim()) {
                    onInput(inputBuffer.trim());
                }
                inputBuffer = '';
                term.write(formatPrompt(workingDirectory));
            } 
            // Backspace (127)
            else if (code === 127) {
                if (inputBuffer.length > 0) {
                    inputBuffer = inputBuffer.slice(0, -1);
                    term.write('\b \b');
                }
            } 
            // Normal printable characters
            else if (code >= 32 && code <= 126) {
                inputBuffer += data;
                term.write(data);
            }
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
  }, [onInput, processLogs, formatPrompt, workingDirectory, theme]);

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

  // Handle AI Generation
  const handleGenerateCommand = () => {
    if (!aiRequest.trim()) return;
    setIsGenerating(true);
    
    // Simulate AI Call
    setTimeout(() => {
        // Simple mock response logic for demo
        let response = `find . -name "${aiRequest.split(' ')[0]}*"`;
        if (aiRequest.includes('kill') && aiRequest.includes('3000')) {
             response = "kill -9 $(lsof -t -i:3000)";
        } else if (aiRequest.includes('log')) {
             response = 'find . -name "*.log" -size +100M -delete';
        }
        
        setAiResult(response);
        setIsGenerating(false);
    }, 1500);
  };

  const handleInsertCommand = () => {
      if (!xtermRef.current || !aiResult) return;
      onInput(aiResult);
      // Optional: focus terminal
      xtermRef.current.focus();
      // Reset
      setAiResult('');
      setAiRequest('');
  };

  // Settings Panel Content
  const settingsContent = (
    <div className="space-y-6 text-zinc-300">
       <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                AI Command Generator
            </label>
            <div className="p-4 bg-zinc-800/50 rounded border border-zinc-700 space-y-4">
                
                {/* Request Input */}
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Request</label>
                    <textarea 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 focus:border-purple-500 outline-none resize-none h-20"
                        placeholder="e.g. Find all large log files and delete them"
                        value={aiRequest}
                        onChange={e => setAiRequest(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerateCommand();
                            }
                        }}
                    />
                </div>

                {/* Generate Button */}
                {!aiResult && (
                    <button 
                        onClick={handleGenerateCommand}
                        disabled={isGenerating || !aiRequest.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Generating...</span>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                <span>Generate Command</span>
                            </>
                        )}
                    </button>
                )}

                {/* Result Area */}
                {aiResult && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2 border-t border-zinc-700/50">
                        <div className="bg-black/50 p-3 rounded font-mono text-sm text-green-400 border border-zinc-700 break-all">
                            &gt; {aiResult}
                        </div>
                        <button 
                            onClick={handleInsertCommand}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-200 hover:bg-white text-zinc-900 rounded font-bold transition-colors"
                        >
                            <span>Insert into Terminal</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>
       </div>
    </div>
  );

  const content = (
      <div 
        className="h-full w-full overflow-hidden bg-zinc-950/90 text-left" 
        ref={terminalRef} 
        // Force background to be partially transparent to show "Bleed through"
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(30,30,40,0.5) 0%, rgba(10,10,15,0.95) 100%)' }}
      />
  );

  if (hideWrapper) return content;

  return (
    <UniversalCardWrapper
      title="Terminal (Local)"
      icon={TerminalIcon}
      aiContext={workingDirectory || 'Local Terminal'}
      settings={settingsContent}
      headerEnd={headerEnd}
      hideAiButton={true}
    >
      {content}
    </UniversalCardWrapper>
  );
}
