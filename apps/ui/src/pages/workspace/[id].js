import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { trpc } from '../../utils/trpc';
import { VfsViewer } from '../../components/VfsViewer';
import { GitControls } from '../../components/GitControls';
import { useState, useEffect } from 'react';
import { Panel } from '../../components/ui/Panel';
const MyWorkspacePage = () => {
    const { id } = useParams();
    const workspaceName = id || 'default';
    const [vfsToken, setVfsToken] = useState(null);
    const tokenMutation = trpc.vfs.getToken.useMutation({
        onSuccess: (data) => setVfsToken(data.token),
    });
    useEffect(() => {
        if (workspaceName) {
            tokenMutation.mutate({ workspaceId: workspaceName });
        }
    }, [workspaceName, tokenMutation.mutate]); // Added tokenMutation.mutate to dependency array
    const { data: files, isLoading, isError, error, } = trpc.vfs.listFiles.useQuery({ vfsToken: vfsToken }, // Input
    { enabled: !!vfsToken } // Options
    );
    return (_jsxs("div", { className: "flex h-screen flex-col gap-4 bg-neutral-900 p-4 text-neutral-100", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("h1", { className: "text-xl font-bold text-neon-cyan", children: ["Workspace: ", workspaceName] }) }), _jsxs("div", { className: "flex flex-grow gap-4 overflow-hidden", children: [_jsx("div", { className: "w-64 flex-shrink-0", children: _jsx(Panel, { borderColor: "border-purple-500", children: _jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "p-2 font-bold border-b border-neutral-800", children: "Explorer" }), _jsx("div", { className: "flex-grow overflow-hidden", children: _jsx(VfsViewer, { files: files || [], workspaceName: workspaceName, isLoading: isLoading || tokenMutation.isPending }) }), isError && _jsxs("p", { className: "p-2 text-xs text-red-500", children: ["Error: ", error?.message] })] }) }) }), _jsx("div", { className: "flex-grow", children: _jsx(Panel, { borderColor: "border-green-400", children: _jsx("div", { className: "flex items-center justify-center h-full text-neutral-500", children: "Select a file to edit (Editor Component coming in Epic 12)" }) }) }), _jsx("div", { className: "w-80 flex-shrink-0 flex flex-col gap-4", children: vfsToken && _jsx(GitControls, { vfsToken: vfsToken }) })] })] }));
};
export default MyWorkspacePage;
