import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { BrowserCard } from './BrowserCard.js';

export const SmartBrowser = ({ cardId, screenspaceId, url, onUrlChange }: { cardId: string; screenspaceId: number; url: string; onUrlChange?: (url: string) => void }) => {
  return (
    <SmartContainer type="BROWSER" title="Live Preview">
      {(registerContext) => (
        <BrowserCard 
           cardId={cardId}
           screenspaceId={screenspaceId}
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
