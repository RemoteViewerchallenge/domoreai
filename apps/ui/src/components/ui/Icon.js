import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense, forwardRef } from 'react';
const Icon = forwardRef(({ name, ...props }, ref) => {
    if (name.startsWith('codicon-')) {
        return _jsx("span", { className: `codicon ${name}` });
    }
    const LucideIcon = lazy(() => import('lucide-react').then(module => {
        const iconName = name;
        if (iconName in module) {
            return { default: module[iconName] };
        }
        // Return a fallback component or null if the icon is not found
        return { default: () => null };
    }));
    return (_jsx(Suspense, { fallback: _jsx("div", { style: { width: 24, height: 24 } }), children: _jsx(LucideIcon, { ref: ref, ...props }) }));
}); // Closing parenthesis for forwardRef
export { Icon };
