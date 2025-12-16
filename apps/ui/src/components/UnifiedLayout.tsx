import React from 'react';
import { Outlet } from 'react-router-dom';
import { FloatingNavigation } from './FloatingNavigation.js';

export const UnifiedLayout = () => {
  return (
    <div className="h-screen w-screen bg-[var(--color-background)] overflow-hidden relative font-sans text-[var(--color-text)]">
      {/* THE MAIN CONTENT AREA 
         No margins, no sidebars. Just pure content taking the full screen.
      */}
      <div className="absolute inset-0 z-0">
        <Outlet />
      </div>

      {/* THE FLOATING NAV ORB */}
      <FloatingNavigation />
    </div>
  );
};
