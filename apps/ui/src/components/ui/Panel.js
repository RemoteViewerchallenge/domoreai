import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const Panel = React.forwardRef(({ className, borderColor = 'border-cyan-400', borderDirection = 't', ...props }, ref) => {
    const borderClass = `border-${borderDirection}-2`;
    return (_jsx("div", { ref: ref, className: cn('bg-neutral-900', borderClass, borderColor, className), ...props }));
});
Panel.displayName = 'Panel';
export { Panel };
