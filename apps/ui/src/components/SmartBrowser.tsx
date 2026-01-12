import React from 'react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { BrowserCard } from './BrowserCard.js';

export const SmartBrowser = ({ url }: { url: string }) => {
  return (
    <SmartContainer type="BROWSER" title="Live Preview">
      {(registerContext) => (
        <BrowserCard 
           initialUrl={url}
           hideWrapper
           onLoad={(frameContent: string) => {
               // Security warning: Cross-origin frames might block this
               registerContext(() => frameContent);
           }}
        />
      )}
    </SmartContainer>
  );
};
