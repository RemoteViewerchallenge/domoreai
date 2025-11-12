import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Button } from './ui/Button';
import Icon from './ui/Icon';
import { Panel } from './ui/Panel';
export function GitControls({ vfsToken }) {
    const [commitMessage, setCommitMessage] = useState('');
    const [showLog, setShowLog] = useState(false);
    const gitCommit = trpc.git.commit.useMutation();
    const gitLog = trpc.git.log.useQuery({ vfsToken }, // Input
    { enabled: showLog && !!vfsToken } // Options
    );
    const handleCommit = () => {
        if (!vfsToken)
            return;
        gitCommit.mutate({ vfsToken, message: commitMessage });
        setCommitMessage('');
    };
    if (!vfsToken) {
        return (_jsx(Panel, { borderColor: "border-red-500", children: _jsx("div", { className: "p-2 text-red-400", children: "Git Controls: vfsToken not available." }) }));
    }
    return (_jsx(Panel, { borderColor: "border-blue-400", children: _jsxs("div", { className: "flex flex-col space-y-2 p-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-neutral-100", children: "Git Controls" }), _jsx(Button, { onClick: () => setShowLog(!showLog), size: "sm", variant: "ghost", children: showLog ? 'Hide Log' : 'View Log' })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("input", { type: "text", value: commitMessage, onChange: (e) => setCommitMessage(e.target.value), placeholder: "Commit message...", className: "flex-grow rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none" }), _jsxs(Button, { onClick: handleCommit, disabled: gitCommit.isPending, size: "sm", children: [_jsx(Icon, { name: "git-commit" }), " Commit"] })] }), gitCommit.isSuccess && _jsx("p", { className: "text-xs text-green-400", children: "Commit successful!" }), gitCommit.isError && _jsxs("p", { className: "text-xs text-red-400", children: ["Error: ", gitCommit.error?.message] }), showLog && (_jsxs("div", { className: "mt-2 rounded-md border border-neutral-700 bg-neutral-950 p-2", children: [gitLog.isLoading && _jsx("p", { className: "text-xs text-neutral-400", children: "Loading log..." }), gitLog.isError && _jsxs("p", { className: "text-xs text-red-400", children: ["Error: ", gitLog.error?.message] }), gitLog.data && (_jsx("pre", { className: "h-48 overflow-auto text-xs font-mono text-neutral-300", children: Array.isArray(gitLog.data) ? (gitLog.data.map((log, i) => (_jsxs("div", { className: "mb-2 border-b border-neutral-800 pb-1 last:border-0", children: [_jsx("span", { className: "text-yellow-400", children: log.hash?.substring(0, 7) }), _jsx("span", { className: "ml-2 text-neutral-500", children: log.date }), _jsx("div", { className: "ml-4 text-neutral-200", children: log.message })] }, i)))) : (JSON.stringify(gitLog.data, null, 2)) }))] }))] }) }));
}
