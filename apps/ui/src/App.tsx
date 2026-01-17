
import { Routes, Route } from "react-router-dom";
import './App.css';
import { NebulaShell } from './components/nebula/primitives/NebulaShell.js';
import { Toaster } from './components/ui/toaster.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { FileSystemProvider } from './stores/FileSystemStore.js';
import { BuilderPage } from "./nebula/pages/BuilderPage.js";
import { ThemeManager } from "./components/nebula/ThemeManager.js";
import { NebulaLayout } from "./components/nebula/layout/NebulaLayout.js";


function App() {
  return (
    <ThemeProvider>
        <FileSystemProvider>
      <Routes>
        {/* 1. THE PUBLIC APP (The Player) */}
        <Route path="/*" element={
          <NebulaLayout>
            <NebulaShell />
            <Toaster />
          </NebulaLayout>
        } />

        {/* 2. THE ADMIN TOOLS (The Workbench) */}
        <Route path="/ui-studio/:projectId" element={<BuilderPage />} />
        <Route path="/admin/theme" element={<ThemeManager />} />
      </Routes>
        </FileSystemProvider>
    </ThemeProvider>
  );
}

export default App;
