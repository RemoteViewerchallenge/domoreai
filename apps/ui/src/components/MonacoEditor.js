import { jsx as _jsx } from "react/jsx-runtime";
import Editor, {} from '@monaco-editor/react';
function MonacoEditor({ value, onChange, language }) {
    return (_jsx(Editor, { height: "300px", language: language, value: value, onChange: onChange, theme: "vs-dark" }));
}
export default MonacoEditor;
