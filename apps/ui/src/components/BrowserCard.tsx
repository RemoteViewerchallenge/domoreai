import React, { useRef, useState } from 'react';

/**
 * BrowserCard: An Electron-only browser card using the <webview> tag for full browsing.
 * Shows a warning if not running in Electron.
 */

const isElectron = () => {
  // Check for Electron renderer process
  return typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as unknown as { versions?: { electron?: string } }).versions?.electron;
};

export const BrowserCard: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [input, setInput] = useState(url);
  const webviewRef = useRef<HTMLWebViewElement>(null);

  const handleGo = () => {
    setUrl(input);
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

  if (!isElectron()) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-900 rounded border border-yellow-300">
        <b>BrowserCard:</b> Full browsing is only available in the desktop (Electron) app.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-card-background)] rounded shadow border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)]">
        <button onClick={handleBack} className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300">◀</button>
        <button onClick={handleForward} className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300">▶</button>
        <button onClick={handleReload} className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300">⟳</button>
        <input
          className="flex-1 px-2 py-1 rounded border border-zinc-300 text-xs"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
        />
        <button onClick={handleGo} className="px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">Go</button>
      </div>
      {/** @ts-expect-error Electron-specific props: allowpopups, webpreferences */}
      <webview
        ref={webviewRef}
        src={url}
        style={{ flex: 1, width: '100%', height: '100%' }}
        allowpopups
        webpreferences="nativeWindowOpen=yes, contextIsolation=yes, nodeIntegration=no"
      />
    </div>
  );
};

export default BrowserCard;
