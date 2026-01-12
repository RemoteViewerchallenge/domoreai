import './App.css';
import { NebulaShell } from './nebula/NebulaShell.js';
import { NebulaRenderer } from './features/nebula-renderer/NebulaRenderer.js';
import { FileSystemProvider } from './stores/FileSystemStore.js';
import { NewUIRoot } from './components/appearance/NewUIRoot.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import crmProject from './data/projects/crm.json';

export default function App() {
  // 1. Check URL for "?mode=standalone"
  const params = new URLSearchParams(window.location.search);
  const isStandalone = params.get('mode') === 'standalone';

  // 2. If Standalone, just render the App (e.g. for deployment)
  if (isStandalone) {
     // For now, load crm.json as default in standalone
     return (
       <NewUIRoot>
         <div className="h-screen w-screen overflow-auto">
            <NebulaRenderer node={crmProject.layout as any} />
         </div>
       </NewUIRoot>
     ); 
  }

  // 3. Otherwise, render the OS (The Shell)
  return (
    <NewUIRoot>
      <FileSystemProvider>
        <ErrorBoundary>
          <NebulaShell />
        </ErrorBoundary>
      </FileSystemProvider>
    </NewUIRoot>
  );
}
