import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import useCoreStore from '../../stores/useCoreStore';
import PageRenderer from './PageRenderer';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * The main workspace grid component that renders the C.O.R.E. dynamic layout.
 */
const WorkspaceGrid: React.FC = () => {
  const { pages, currentLayout, updateLayout } = useCoreStore((state) => ({
    pages: Array.from(state.pages.values()),
    currentLayout: state.currentLayout,
    updateLayout: state.updateLayout,
  }));

  const onLayoutChange = (layout: ReactGridLayout.Layout[]) => {
    updateLayout(layout);
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: currentLayout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
    >
      {pages.map((page) => (
        <div key={page.id} data-grid={{ w: 6, h: 4, x: 0, y: Infinity }}>
          <div className="card h-full w-full">
            <div className="card-body">
              <h3 className="card-title">{page.title}</h3>
              <PageRenderer page={page} />
            </div>
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default WorkspaceGrid;
