import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export const VfsViewer = ({ files, isLoading }) => {
    if (isLoading) {
        return _jsx("div", { children: "Loading files..." });
    }
    return (_jsx("pre", { children: JSON.stringify(files, null, 2) }));
};
