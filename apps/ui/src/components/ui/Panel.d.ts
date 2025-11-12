import React from 'react';
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    borderColor?: string;
    borderDirection?: 't' | 'l' | 'b' | 'r';
}
declare const Panel: React.ForwardRefExoticComponent<PanelProps & React.RefAttributes<HTMLDivElement>>;
export { Panel };
