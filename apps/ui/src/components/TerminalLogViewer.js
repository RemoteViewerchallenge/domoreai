import { jsx as _jsx } from "react/jsx-runtime";
import React, { useRef, useEffect, useMemo } from 'react';
import Editor, {} from '@monaco-editor/react';
const TerminalLogViewer = ({ messages }) => {
    const editorRef = useRef(null);
    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };
    const formattedMessages = useMemo(() => {
        return messages
            .map((msg) => `[${msg.timestamp}] [${msg.type.toUpperCase()}] ${msg.message}`)
            .join('\n');
    }, [messages]);
    useEffect(() => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                editorRef.current.revealLine(model.getLineCount());
            }
        }
    }, [messages]);
    return (_jsx(Editor, { height: "100%", width: "100%", language: "log", theme: "vs-dark", value: formattedMessages, onMount: handleEditorDidMount, options: {
            readOnly: true,
            domReadOnly: true,
            lineNumbers: 'off',
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
        } }));
};
export default TerminalLogViewer;
