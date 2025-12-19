import { UnifiedMenuBar } from './UnifiedMenuBar.js';

export const UnifiedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-white overflow-hidden selection:bg-purple-500/30">
      {/* 1. Top Navigation Bar */}
      <div className="flex-none z-50 relative shadow-md">
        <UnifiedMenuBar />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>
      
      {/* 3. Global Overlays (Toasts, Modals) can go here */}
    </div>
  );
};
