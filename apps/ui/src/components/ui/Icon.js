import { jsx as _jsx } from "react/jsx-runtime";
import { Suspense } from 'react';
import { icons } from 'lucide-react';
const Icon = ({ name, ...props }) => {
    if (name.startsWith('codicon-')) {
        return _jsx("span", { className: `codicon ${name}`, ...props });
    }
    const LucideIcon = icons[name];
    if (LucideIcon) {
        return (_jsx(Suspense, { fallback: _jsx("div", {}), children: _jsx(LucideIcon, { ...props }) }));
    }
    return null;
};
export default Icon;
