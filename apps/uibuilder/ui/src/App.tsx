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
        <div style={{ 
          display: 'flex', 
          width: '100vw', 
          height: '100vh', 
          background: '#0a0a0c', 
          overflow: 'hidden' 
        }}>
          {/* Sidebar container */}
          <div style={{ 
            width: sidebarOpen ? 300 : 0, 
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            flexShrink: 0
          }}>
             <div style={{ width: 300, height: '100%' }}>
               <LayerSidebar onClose={() => setSidebarOpen(false)} />
             </div>
          </div>
          
          {/* Main Container */}
          <div style={{ 
            flex: 1, 
            height: '100%',
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex'
          }}>
            <ContextMenu onShowLayers={() => setSidebarOpen(true)}>
              {/* Ensure Frame fills the context menu div */}
              <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <Frame>
                  <Element id="ROOT" is={Canvas} canvas />
                </Frame>
              </div>
            </ContextMenu>
          </div>
        </div>
      </Editor>
    </VarStoreProvider>
  );
}