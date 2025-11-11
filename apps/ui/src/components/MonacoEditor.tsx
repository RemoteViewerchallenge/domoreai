import Editor, { type OnChange } from '@monaco-editor/react';

/**
 * @interface MonacoEditorProps
 * @description Props for the MonacoEditor component.
 */
interface MonacoEditorProps {
  /**
   * @property {string} value - The current value of the editor's content.
   */
  value: string;
  /**
   * @property {OnChange} onChange - The callback function to be executed when the editor's content changes.
   */
  onChange: OnChange;
  /**
   * @property {string} language - The programming language for syntax highlighting.
   */
  language: string;
}

/**
 * @component MonacoEditor
 * @description A wrapper component for the Monaco Editor, configured with a dark theme.
 * @param {MonacoEditorProps} props - The component props.
 * @returns {JSX.Element} The rendered Monaco Editor.
 */
function MonacoEditor({ value, onChange, language }: MonacoEditorProps) {
  return (
    <Editor
      height="300px"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
    />
  );
}

export default MonacoEditor;
