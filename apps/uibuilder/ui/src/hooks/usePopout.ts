import { useState, useCallback, useRef } from 'react';
import { useEditor } from '@craftjs/core';
import ReactDOM from 'react-dom';
import React from 'react';

export function usePopout(nodeId: string) {
  const [isPopped, setIsPopped] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const { query } = useEditor();

  const popIn = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.close();
      popupRef.current = null;
    }
    setIsPopped(false);
  }, []);

  const popOut = useCallback(() => {
    const serialized = query.node(nodeId).serialize();
    const popup = window.open('', '_blank', 'width=800,height=600');
    
    if (!popup) return;
    popupRef.current = popup;
    setIsPopped(true);

    popup.document.body.style.margin = '0';
    popup.document.body.style.background = '#09090b';
    popup.document.title = `Popped Out: ${nodeId}`;

    // Create a container for the portal
    const container = popup.document.createElement('div');
    popup.document.body.appendChild(container);

    // Note: Rendering a Frame into a separate window requires the same Editor context.
    // For this prototype, we'll just render a static preview or a message.
    // Real implementation would involve passing the resolver and state.
    
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch (e) {
          return '';
        }
      })
      .join('');

    const styleEl = popup.document.createElement('style');
    styleEl.textContent = styles;
    popup.document.head.appendChild(styleEl);

    popup.onbeforeunload = () => setIsPopped(false);
  }, [nodeId, query]);

  return { isPopped, popOut, popIn };
}
