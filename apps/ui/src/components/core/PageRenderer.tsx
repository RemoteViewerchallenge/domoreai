import React, { Suspense } from 'react';
import type { Page } from '../../stores/useCoreStore';

// Lazy-loaded page components
const VFSPage = React.lazy(() => import('../../pages/VFSPage')); // Adjust path as needed
const TerminalPage = React.lazy(() => import('../../pages/TerminalPage')); // Adjust path as needed
const SpreadsheetPage = React.lazy(() => import('../../pages/SpreadsheetPage')); // Adjust path as needed
const TaskPage = React.lazy(() => import('../../pages/TaskPage')); // Adjust path as needed

// A registry to map page types to their corresponding components
const PAGE_REGISTRY = {
  VFS: VFSPage,
  TERMINAL: TerminalPage,
  SPREADSHEET: SpreadsheetPage,
  TASKS: TaskPage,
};

interface PageRendererProps {
  page: Page;
}

/**
 * Renders a component based on the page type.
 *
 * @param {Page} page - The page object containing the type and other data.
 * @returns The corresponding React component or null if the type is not found.
 */
const PageRenderer: React.FC<PageRendererProps> = ({ page }) => {
  const Component = PAGE_REGISTRY[page.type as keyof typeof PAGE_REGISTRY];

  if (!Component) {
    console.warn(`No component found for page type: ${page.type}`);
    return <div>Component not found: {page.type}</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
};

export default PageRenderer;
