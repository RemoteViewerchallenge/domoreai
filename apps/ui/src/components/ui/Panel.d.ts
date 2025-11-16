import React from 'react';
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    borderColor: string;
}
declare const Panel: React.FC<PanelProps>;
export { Panel };
