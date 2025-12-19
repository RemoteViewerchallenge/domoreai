import React from 'react';
import { Outlet } from 'react-router-dom';
import { FloatingNavigation } from './FloatingNavigation.js';

interface UnifiedLayoutProps {
  children?: React.ReactNode;
}

export const UnifiedLayout = ({ children }: UnifiedLayoutProps) => {
  return (
    <div className="h-screen w-screen bg-[var(--color-background)] overflow-hidden relative font-sans text-[var(--color-text)]">
      {/* THE MAIN CONTENT AREA */}
      <div className="absolute inset-0 z-0">
        {children || <Outlet />}
      </div>

      {/* THE FLOATING NAV ORB */}
      <FloatingNavigation />
    </div>
  );
};
