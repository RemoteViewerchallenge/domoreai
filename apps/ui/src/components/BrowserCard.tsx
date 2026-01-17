import React, { useRef, useState } from 'react';
import { UniversalCardWrapper } from './work-order/UniversalCardWrapper.js';
import ResearchBrowser from './ResearchBrowser.js';
import { Globe, ArrowLeft, ArrowRight, RotateCw, Lock, BookOpen, FileText } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { toast } from 'sonner';

/**
 * BrowserCard: An Electron-only browser card using the <webview> tag.
 * Wraps functionality in the UniversalCardWrapper.
 */

// Define WebView props for type safety
interface WebViewProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
    src?: string;
    allowpopups?: boolean | string;
    webpreferences?: string;
    useragent?: string;
    partition?: string;
    preload?: string;
    httpreferrer?: string;
    nodeintegration?: boolean;
    plugins?: boolean;
    disablewebsecurity?: boolean;
    allowfullscreen?: boolean;
    autosize?: string;
    popups?: boolean;
}

const WebView = 'webview' as unknown as React.FC<WebViewProps>;

const isElectron = () => {
  return typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as unknown as { versions?: { electron?: string } }).versions?.electron;
};

interface BrowserCardProps {
  cardId?: string;
  screenspaceId?: number;
  headerEnd?: React.ReactNode;
  initialUrl?: string;
  onLoad?: (content: string) => void;
  hideWrapper?: boolean;
}

export const BrowserCard: React.FC<BrowserCardProps> = ({ cardId, screenspaceId, headerEnd, initialUrl = 'https://www.google.com', onLoad, hideWrapper }) => {
  const [url, setUrl] = useState(initialUrl);
  const [input, setInput] = useState(url);
  const webviewRef = useRef<HTMLWebViewElement>(null);
  
  // Reader Mode State
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerContent, setReaderContent] = useState<string>('');
  const scrapeMutation = trpc.browser.scrape.useMutation();

  // Sync URL/Content to context
  React.useEffect(() => {
    if (onLoad) {
        // If in reader mode, pass the text content so it can be saved!
        if (isReaderMode) onLoad(readerContent);
        else onLoad(url);
    }
  }, [url, onLoad, isReaderMode, readerContent]);

  // Sync internal state with external prop updates (for navigation via links)
  React.useEffect(() => {
    if (initialUrl && initialUrl !== url) {
        setUrl(initialUrl);
        setInput(initialUrl);
    }
  }, [initialUrl, url]); 
  
  // Settings State
  const [showDebugView, setShowDebugView] = useState(false);
  const [blockAds, setBlockAds] = useState(true);
  const [mobileUA, setMobileUA] = useState(false);

  const handleGo = () => {
    let target = input;
    if (!target.startsWith('http')) {
      target = `https://${target}`;
    }
    setUrl(target);
    setIsReaderMode(false); // Reset reader on nav
  };

  const handleBack = () => {
    if (isReaderMode) { setIsReaderMode(false); return; }
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.goBack();
  };
  const handleForward = () => {
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.goForward();
  };
  const handleReload = () => {
     if (isReaderMode) { void handleScrape(); return; }
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.reload();
  };

  const handleScrape = async () => {
      try {
          const toastId = toast.loading("Extracting content...");
          const result = await scrapeMutation.mutateAsync({ url });
          setReaderContent(`# ${result.title}\n\n${result.content}`);
          setIsReaderMode(true);
          toast.dismiss(toastId);
          toast.success("Content extracted!");
      } catch (err) {
          toast.error("Scrape Failed", { description: (err as Error).message });
      }
  };

  // Settings Panel Content
  const settingsContent = (
    <div className="space-y-6 text-foreground">
      
      {/* Active Role - Mocked for visual */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Role</label>
        <div className="p-3 bg-muted rounded border border-border flex items-center justify-between">
            <span>Research Agent (GPT-4)</span>
            <span className="text-xs text-muted-foreground">▼</span>
        </div>
      </div>

      {/* Debugging */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Debugging</label>
        <div className="p-3 bg-muted/50 rounded border border-border space-y-3">
            <div className="flex items-center gap-3">
                <input 
                    type="checkbox" 
                    id="debug-toggle" 
                    checked={showDebugView} 
                    onChange={e => setShowDebugView(e.target.checked)}
                    className="w-4 h-4 accent-secondary bg-accent border-input rounded focus:ring-secondary focus:ring-offset-0"
                />
                <div>
                    <label htmlFor="debug-toggle" className="block text-sm font-medium text-foreground">Show Agent&apos;s &quot;Research Browser&quot; Stream</label>
                    <p className="text-xs text-muted-foreground">Enable this only if the Agent is stuck or for debugging remote browsing.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options</label>
        <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={blockAds} 
                    onChange={e => setBlockAds(e.target.checked)}
                    className="w-4 h-4 accent-info rounded"
                />
                <span className="text-sm">Block Ads</span>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={mobileUA} 
                    onChange={e => setMobileUA(e.target.checked)}
                    className="w-4 h-4 accent-info rounded"
                />
                <span className="text-sm">Mobile User Agent</span>
            </label>
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="flex flex-col w-full h-full bg-background">
         {/* NATIVE-STYLE ADDRESS BAR (Toolbar) */}
         {!showDebugView && (
            <div className="h-10 bg-background flex items-center px-2 space-x-2 border-b border-border shrink-0">
                <button type="button" onClick={handleBack} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <button type="button" onClick={handleForward} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight size={16} />
                </button>
                <button type="button" onClick={handleReload} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                    <RotateCw size={16} />
                </button>
                
                {/* Address Input */}
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                        <Lock size={12} />
                    </div>
                    <input 
                        className="w-full bg-card text-foreground text-xs font-mono rounded-full py-1.5 pl-8 pr-4 border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
                        onFocus={e => e.target.select()}
                        placeholder="Enter URL or search..."
                    />
                </div>

                {/* Reader Toggle */}
                <button 
                    type="button" 
                    onClick={() => { if(isReaderMode) { setIsReaderMode(false); } else { void handleScrape(); } }} 
                    className={`p-1.5 rounded-md transition-colors ${isReaderMode ? 'bg-purple-900/50 text-purple-400' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                    title={isReaderMode ? "Exit Reader" : "Reader Mode (Scrape)"}
                >
                    {isReaderMode ? <FileText size={16} /> : <BookOpen size={16} />}
                </button>
            </div>
         )}

        {/* BROWSER CONTENT */}
        <div className="flex-1 relative bg-white overflow-hidden">
            {isReaderMode ? (
                <div className="absolute inset-0 z-40 bg-[var(--bg-background)] overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-2xl mx-auto prose prose-invert prose-sm">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300 bg-zinc-900/50 p-4 rounded border border-zinc-800">
                            {readerContent}
                        </pre>
                    </div>
                </div>
            ) : null}
            
            {!isElectron() && !showDebugView && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-8">
                    <div className="bg-warning/20 border border-warning/50 p-6 rounded-lg max-w-md text-center">
                        <h3 className="text-warning font-bold mb-2">Electron Required</h3>
                        <p className="text-warning/60 text-sm mb-4">
                            The native browser view requires the Electron app. 
                            Enable &quot;Show Agent&apos;s Research Browser&quot; in settings to use the remote browser instead.
                        </p>
                        <button 
                            type="button"
                            onClick={() => setShowDebugView(true)}
                            className="px-4 py-2 bg-warning hover:bg-warning/80 text-black font-bold rounded transition-colors"
                        >
                            Switch to Remote Browser
                        </button>
                    </div>
                 </div>
            )}
            {showDebugView ? (
                <div className="w-full h-full bg-card">
                    <ResearchBrowser key={`research-${cardId}-${screenspaceId}`} cardId={cardId} screenspaceId={screenspaceId} initialUrl={url} />
                </div>
            ) : (
                isElectron() ? (
                    <WebView
                        key={`browser-${cardId}-${screenspaceId}-${url}`}
                        ref={webviewRef}
                        src={url}
                        style={{ width: '100%', height: '100%', visibility: isReaderMode ? 'hidden' : 'visible' }}
                        allowpopups="true"
                        webpreferences="nativeWindowOpen=yes"
                        useragent={mobileUA ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" : undefined}
                    />
                ) : null
            )}
        </div>
    </div>
  );

  if (hideWrapper) return content;

  return (
    <UniversalCardWrapper
      title="Browser (Electron)"
      icon={Globe}
      aiContext={url}
      settings={settingsContent}
      headerEnd={headerEnd}
    >
        {content}
    </UniversalCardWrapper>
  );
}
