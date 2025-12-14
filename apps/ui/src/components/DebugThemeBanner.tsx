import React, { useEffect, useState } from 'react';

export const DebugThemeBanner = () => {
  const [debugInfo, setDebugInfo] = useState<{ primary: string; bg: string }>({ primary: '?', bg: '?' });

  useEffect(() => {
    // Read what the browser ACTUALLY sees for these variables
    const styles = getComputedStyle(document.documentElement);
    setDebugInfo({
      primary: styles.getPropertyValue('--color-primary').trim(),
      bg: styles.getPropertyValue('--color-background').trim()
    });
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[10000] p-2 bg-red-900 border-t-4 border-red-500 text-white font-mono text-xs font-bold shadow-2xl">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="uppercase tracking-widest text-red-200">Titanium Debugger</span>
          <span>If these squares are black, your theme is broken.</span>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span>--color-primary:</span>
            <div className="w-6 h-6 border border-white" style={{ backgroundColor: 'var(--color-primary)' }} />
            <span className="opacity-50">({debugInfo.primary})</span>
          </div>

          <div className="flex items-center gap-2">
            <span>--color-background:</span>
            <div className="w-6 h-6 border border-white" style={{ backgroundColor: 'var(--color-background)' }} />
            <span className="opacity-50">({debugInfo.bg})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
