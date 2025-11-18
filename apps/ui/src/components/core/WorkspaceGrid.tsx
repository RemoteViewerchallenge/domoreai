import React, { useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Card } from 'flyonui';
import { useCoreStore } from '../../stores/useCoreStore';
import PageRenderer from './PageRenderer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const WorkspaceGrid: React.FC = () => {
  const { pages, currentLayout, updateLayout } = useCoreStore();

  useEffect(() => {
    const newLayout = Array.from(pages.values()).map((page, index) => {
      const existingLayoutItem = currentLayout.find((item) => item.i === page.id);
      if (existingLayoutItem) {
        return existingLayoutItem;
      }
      return {
        i: page.id,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 8,
        w: 4,
        h: 8,
      };
    });
    updateLayout(newLayout);
  }, [pages, updateLayout]);

  const onLayoutChange = (layout: ReactGridLayout.Layout[]) => {
    updateLayout(layout);
  };

  return (
    <ResponsiveReactGridLayout
      className="layout"
      layouts={{ lg: currentLayout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
    >
      {Array.from(pages.values()).map((page) => (
        <div key={page.id}>
          <Card className="h-full w-full">
            <Card.Header>{page.title}</Card.Header>
            <Card.Content>
              <PageRenderer pageType={page.type} />
            </Card.Content>
          </Card>
        </div>
      ))}
    </ResponsiveReactGridLayout>
  );
};

export default WorkspaceGrid;
