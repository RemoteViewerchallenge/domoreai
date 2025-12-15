import React, { useRef, useState } from 'react';
import { UniversalCardWrapper } from './work-order/UniversalCardWrapper.js';
import ResearchBrowser from './ResearchBrowser.js';
import { Globe, ArrowLeft, ArrowRight, RotateCw, Lock } from 'lucide-react';

/**
 * BrowserCard: An Electron-only browser card using the <webview> tag.
 * Wraps functionality in the UniversalCardWrapper.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebView = 'webview' as any;

const isElectron = () => {
  return typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as unknown as { versions?: { electron?: string } }).versions?.electron;
};

interface BrowserCardProps {
  headerEnd?: React.ReactNode;
}

export const BrowserCard: React.FC<BrowserCardProps> = ({ headerEnd }) => {
  const [url, setUrl] = useState('https://www.google.com');
  const [input, setInput] = useState(url);
  const webviewRef = useRef<HTMLWebViewElement>(null);
  
  // Settings State
  const [showDebugView, setShowDebugView] = useState(false);
  const [blockAds, setBlockAds] = useState(true);
  const [mobileUA, setMobileUA] = useState(false);

  // Sync input with valid URL changes (optional, usually annoying if typing)
  // We'll just update input on navigation events if we could listen to them.

  const handleGo = () => {
    let target = input;
    if (!target.startsWith('http')) {
      target = `https://${target}`;
    }
    setUrl(target);
  };

  const handleBack = () => {
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.goBack();
  };
  const handleForward = () => {
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.goForward();
  };
  const handleReload = () => {
    // @ts-expect-error Electron webview method
    if (webviewRef.current) webviewRef.current.reload();
  };

  // Settings Panel Content
  const settingsContent = (
    <div className="space-y-6 text-zinc-300">
      
      {/* Active Role - Mocked for visual */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Role</label>
        <div className="p-3 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-between">
            <span>Research Agent (GPT-4)</span>
            <span className="text-xs text-zinc-500">▼</span>
        </div>
      </div>

      {/* Debugging */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Debugging</label>
        <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700 space-y-3">
            <div className="flex items-center gap-3">
                <input 
                    type="checkbox" 
                    id="debug-toggle" 
                    checked={showDebugView} 
                    onChange={e => setShowDebugView(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 bg-zinc-700 border-zinc-600 rounded focus:ring-purple-500 focus:ring-offset-0"
                />
                <div>
                    <label htmlFor="debug-toggle" className="block text-sm font-medium text-zinc-200">Show Agent&apos;s &quot;Research Browser&quot; Stream</label>
                    <p className="text-xs text-zinc-500">Enable this only if the Agent is stuck or for debugging remote browsing.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Options</label>
        <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={blockAds} 
                    onChange={e => setBlockAds(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                />
                <span className="text-sm">Block Ads</span>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={mobileUA} 
                    onChange={e => setMobileUA(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                />
                <span className="text-sm">Mobile User Agent</span>
            </label>
        </div>
      </div>
    </div>
  );

  return (
    <UniversalCardWrapper
      title="Browser (Electron)"
      icon={Globe}
      aiContext={url}
      settings={settingsContent}
      headerEnd={headerEnd}
    >
        {/* Helper for non-Electron envs */}
        {!isElectron() && !showDebugView && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm p-8">
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-6 rounded-lg max-w-md text-center">
                    <h3 className="text-yellow-500 font-bold mb-2">Electron Required</h3>
                    <p className="text-yellow-200/60 text-sm mb-4">
                        The native browser view requires the Electron app. 
                        Enable &quot;Show Agent&apos;s Research Browser&quot; in settings to use the remote browser instead.
                    </p>
                    <button 
                        onClick={() => setShowDebugView(true)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded transition-colors"
                    >
                        Switch to Remote Browser
                    </button>
                </div>
             </div>
        )}

        <div className="flex flex-col w-full h-full bg-zinc-950">
             {/* NATIVE-STYLE ADDRESS BAR (Toolbar) */}
             {!showDebugView && (
                <div className="h-10 bg-zinc-950 flex items-center px-2 space-x-2 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                    <button onClick={handleForward} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                        <ArrowRight size={16} />
                    </button>
                    <button onClick={handleReload} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                        <RotateCw size={16} />
                    </button>
                    
                    {/* Address Input */}
                    <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                            <Lock size={12} />
                        </div>
                        <input 
                            className="w-full bg-zinc-900 text-zinc-200 text-xs font-mono rounded-full py-1.5 pl-8 pr-4 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
                            onFocus={e => e.target.select()}
                            placeholder="Enter URL or search..."
                        />
                    </div>
                </div>
             )}

            {/* BROWSER CONTENT */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {showDebugView ? (
                    <div className="w-full h-full bg-zinc-900">
                        <ResearchBrowser initialUrl={url} />
                    </div>
                ) : (
                    isElectron() ? (
                        <WebView
                            ref={webviewRef}
                            src={url}
                            style={{ width: '100%', height: '100%' }}
                            allowpopups={true}
                            webpreferences="nativeWindowOpen=yes"
                            useragent={mobileUA ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" : undefined}
                        />
                    ) : null
                )}
            </div>
        </div>
    </UniversalCardWrapper>
  );
};

export default BrowserCard;
