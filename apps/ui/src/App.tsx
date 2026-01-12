
import { Routes, Route } from "react-router-dom";
import './App.css';
import { NebulaShell } from './components/nebula/primitives/NebulaShell.js';
import { Toaster } from './components/ui/toaster.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { FileSystemProvider } from './stores/FileSystemStore.js';
import { BuilderPage } from "./nebula/pages/BuilderPage.js";
import { ThemeManager } from "./components/nebula/ThemeManager.js";
import { UnifiedNebulaBar } from "./nebula/features/navigation/UnifiedNebulaBar.js";
import { useLocation } from "react-router-dom";


function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <ThemeProvider>
    <div className="bg-neutral-950 min-h-screen text-white">
      
      {/* 1. The Single Bar */}
      {/* It handles its own visibility logic (hiding on public routes) */}
      <UnifiedNebulaBar />

      {/* 2. The Page Content */}
      {/* If Admin: push down 3.5rem (h-14). If Public: full screen. */}
      <div className={isAdmin ? "pt-14 h-screen" : "h-screen"}>
        <FileSystemProvider>
          <Routes>
            {/* 1. THE PUBLIC APP (The Player) */}
            <Route path="/*" element={
              <>
                <NebulaShell mode="production" />
                <Toaster />
              </>
            } />

            {/* 2. THE ADMIN TOOLS (The Workbench) */}
            {/* Accessible only to devs/admins */}
            <Route path="/admin/builder/:projectId" element={<BuilderPage />} />
            <Route path="/admin/theme" element={<ThemeManager />} />
          </Routes>
        </FileSystemProvider>
      </div>
    </div>
    </ThemeProvider>
  );
}

export default App;
