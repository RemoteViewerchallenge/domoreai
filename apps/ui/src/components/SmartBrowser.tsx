import React, { useState } from 'react';
import { Input } from './ui/input.js';
import { SuperAiButton } from './ui/SuperAiButton.js';

interface SmartBrowserProps {
  initialUrl?: string;
}

export const SmartBrowser: React.FC<SmartBrowserProps> = ({ initialUrl = "https://duckduckgo.com" }) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputVal, setInputVal] = useState(initialUrl);

  const handleNavigate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let finalUrl = inputVal;
      // Ultra-basic Omnibox logic
      if (!finalUrl.startsWith('http') && !finalUrl.includes('localhost')) {
        if (finalUrl.includes('.')) finalUrl = `https://${finalUrl}`;
        else finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalUrl)}`;
      }
      setCurrentUrl(finalUrl);
      setInputVal(finalUrl);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      {/* Dense Agentic Toolbar */}
      <div className="flex items-center space-x-2 p-2 border-b border-border bg-muted/40 h-10">
        <div className="flex-grow relative">
          <Input 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleNavigate}
            placeholder="Search or enter URL..."
            className="w-full h-7 text-[11px] pl-2 pr-8 bg-muted/20 border-border"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-yellow-500 text-muted-foreground text-xs">
            ⭐
          </span>
        </div>
        <SuperAiButton label="Extract Markdown" intent="mutation" className="h-7 text-[10px] px-2" />
      </div>

      {/* Browser Viewport with Dark Mode Hack */}
      <div className="flex-grow relative bg-black">
        <iframe
          src={currentUrl}
          className="absolute inset-0 w-full h-full border-none bg-white"
          style={{ filter: 'invert(0.92) hue-rotate(180deg) contrast(1.1)' }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};