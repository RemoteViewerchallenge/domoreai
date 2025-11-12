import React from 'react';
import type { TerminalMessage } from '@repo/common/agent';
interface TerminalLogViewerProps {
    messages: TerminalMessage[];
}
declare const TerminalLogViewer: React.FC<TerminalLogViewerProps>;
export default TerminalLogViewer;
