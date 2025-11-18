import React, { useCallback } from 'react';
import { WidthProvider, Responsive, Layouts } from 'react-grid-layout';
import useCoreStore from '../../stores/useCoreStore';
import PageRenderer from './PageRenderer';
import { Card, CardContent, CardHeader, CardTitle } from 'flyonui';
import { X } from 'lucide-react';

// Import RGL styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WorkspaceGrid: React.FC = () => {
    const { pages, currentLayout, updateLayout, closePage } = useCoreStore(
        (state) => ({
            pages: Array.from(state.pages.values()), // Convert map values to array
            currentLayout: state.currentLayout,
            updateLayout: state.updateLayout,
            closePage: state.closePage,
        })
    );

    const onLayoutChange = useCallback(
        (layout: ReactGridLayout.Layout[], allLayouts: Layouts) => {
            // We only care about the current layout, so we pass `layout`
            updateLayout(layout);
        },
        [updateLayout]
    );

    const handleClosePage = (id: string) => {
        closePage(id);
    };

    // Define the layouts for different breakpoints
    const layouts = {
        lg: currentLayout,
    };

    return (
        <div className="w-full h-full bg-background text-foreground">
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                onLayoutChange={onLayoutChange}
                draggableHandle=".card-header" // Only allow dragging from the header
            >
                {pages.map((page) => (
                    <div key={page.id} data-grid={{ w: 6, h: 4, x: 0, y: Infinity }}>
                        <Card className="w-full h-full flex flex-col">
                            <CardHeader className="card-header cursor-move flex justify-between items-center p-2">
                                <CardTitle className="text-sm font-medium">{page.title}</CardTitle>
                                <button
                                    onClick={() => handleClosePage(page.id)}
                                    className="p-1 hover:bg-muted rounded-full"
                                    aria-label={`Close ${page.title}`}
                                >
                                    <X size={16} />
                                </button>
                            </CardHeader>
                            <CardContent className="flex-grow p-2 overflow-auto">
                                <PageRenderer page={page} />
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};

export default WorkspaceGrid;
