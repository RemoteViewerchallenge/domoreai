import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useCoreStore } from '../../stores/useCoreStore';
import PageRenderer from './PageRenderer';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WorkspaceGrid: React.FC = () => {
  const { pages, layouts, currentWorkspace, updateLayout } = useCoreStore();

  const onLayoutChange = (layout: ReactGridLayout.Layout[]) => {
    updateLayout(layout);
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
    >
      {Array.from(pages.values()).map((page) => (
        <div key={page.id} className="bg-white rounded-lg shadow-md">
          <PageRenderer pageType={page.type} />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default WorkspaceGrid;
