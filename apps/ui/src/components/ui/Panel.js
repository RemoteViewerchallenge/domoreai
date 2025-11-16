import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '../../lib/utils';
const Panel = ({ className, borderColor, children, ...props }) => {
    return (_jsx("div", { className: cn('bg-neutral-900 border-t-2', borderColor, className), ...props, children: children }));
};
export { Panel };
