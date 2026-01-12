import React from 'react';
import './App.css';
import { NebulaShell } from './nebula/NebulaShell.js';
import { Toaster } from './components/ui/toaster.tsx';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { FileSystemProvider } from './stores/FileSystemStore.js';
// BrowserRouter removed as main.tsx provides HashRouter

function App() {
  return (
    <ThemeProvider>
      {/* Make FileSystem/Workspace data available to ALL Nebula views */}
      <FileSystemProvider>
          
          {/* The Single Source of Truth */}
          <NebulaShell />
          
          <Toaster />
          
      </FileSystemProvider>
    </ThemeProvider>
  );
}

export default App;
