import { jsx as _jsx } from "react/jsx-runtime";
import Editor from "@monaco-editor/react";
export default function MonacoEditor() {
    return (_jsx(Editor, { height: "90vh", defaultLanguage: "javascript", defaultValue: "// some comment" }));
}
