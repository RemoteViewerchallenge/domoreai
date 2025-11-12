import { type OnChange } from '@monaco-editor/react';
interface MonacoEditorProps {
    value: string;
    onChange: OnChange;
    language: string;
}
declare function MonacoEditor({ value, onChange, language }: MonacoEditorProps): import("react/jsx-runtime").JSX.Element;
export default MonacoEditor;
