import React, { Suspense } from 'react';
import { Page } from '../../stores/useCoreStore';
import { Card } from 'flyonui';

// Define a registry for page components. This allows for dynamic component loading.
const PAGE_REGISTRY = {
  // These components will be created later in the project.
  // For now, we'll use placeholder components.
  'VFS': React.lazy(() => import('../pages/VFSPage')),
  'TERMINAL': React.lazy(() => import('../pages/TerminalPage')),
  'SPREADSHEET': React.lazy(() => import('../pages/SpreadsheetPage')),
  'TASKS': React.lazy(() => import('../pages/TaskPage')),
};

interface PageRendererProps {
  page: Page;
}

const PageRenderer: React.FC<PageRendererProps> = ({ page }) => {
  const PageComponent = PAGE_REGISTRY[page.type];

  if (!PageComponent) {
    return (
      <Card>
        <div>Error: Page type "{page.type}" not found.</div>
      </Card>
    );
  }

  return (
    <Suspense fallback={<Card><div>Loading...</div></Card>}>
      <PageComponent />
    </Suspense>
  );
};

export default PageRenderer;
