import React, { Suspense } from 'react';
import { PageType } from '../../types';

const VFSPage = React.lazy(() => import('../pages/VFSPage'));
const TerminalPage = React.lazy(() => import('../pages/TerminalPage'));
const SpreadsheetPage = React.lazy(() => import('../pages/SpreadsheetPage'));
const TaskPage = React.lazy(() => import('../pages/TaskPage'));

const PAGE_REGISTRY: Record<PageType, React.LazyExoticComponent<React.FC>> = {
  VFS: VFSPage,
  TERMINAL: TerminalPage,
  SPREADSHEET: SpreadsheetPage,
  TASKS: TaskPage,
};

interface PageRendererProps {
  pageType: PageType;
}

const PageRenderer: React.FC<PageRendererProps> = ({ pageType }) => {
  const PageComponent = PAGE_REGISTRY[pageType];

  if (!PageComponent) {
    return <div>Unknown page type: {pageType}</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageComponent />
    </Suspense>
  );
};

export default PageRenderer;
