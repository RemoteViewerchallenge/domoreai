/* ═══════════════════════════════════════════════════════════════
   App.tsx — Wires everything together.
   CraftJS Editor wraps everything. Canvas is the root element.
   Sidebar for layers and variables.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { VarStoreProvider } from './core/vars';
import { ContextMenu } from './core/ContextMenu';
import { GridLayout, GridCell } from './components/layout/GridLayout';
import { Canvas } from './components/layout/Canvas';
import { Text } from './components/elements/Text';
import { LayerSidebar } from './components/layout/LayerSidebar';

const resolver = {
  Canvas,
  GridLayout,
  GridCell,
  Text,
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <VarStoreProvider>
      <Editor resolver={resolver}>
        <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#09090b', overflow: 'hidden' }}>
          {sidebarOpen && (
            <LayerSidebar
              onClose={() => setSidebarOpen(false)}
            />
          )}
          
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <ContextMenu onShowLayers={() => setSidebarOpen(true)}>
              <Frame>
                <Element
                  id="ROOT"
                  is={Canvas}
                  canvas
                />
              </Frame>
            </ContextMenu>
          </div>
        </div>
      </Editor>
    </VarStoreProvider>
  );
}