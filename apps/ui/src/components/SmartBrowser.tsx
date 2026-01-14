import React from 'react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { BrowserCard } from './BrowserCard.js';

export const SmartBrowser = ({ url, onUrlChange }: { url: string; onUrlChange?: (url: string) => void }) => {
  return (
    <SmartContainer type="BROWSER" title="Live Preview">
      {(registerContext) => (
        <BrowserCard 
           initialUrl={url}
           hideWrapper
           onLoad={(frameContent: string) => {
               // Security warning: Cross-origin frames might block this
               registerContext(() => frameContent);
               onUrlChange?.(frameContent);
           }}
        />
      )}
    </SmartContainer>
  );
};
