import { ThemeProvider, CssBaseline } from '@mui/material';
import { Editor } from './components/layout/Editor.tsx';
import { workspaceTheme } from './theme/workspace';

export default function App() {
  return (
    <ThemeProvider theme={workspaceTheme}>
      <CssBaseline />
      {/* ContextMenu is GONE from here */}
      <Editor />
    </ThemeProvider>
  );
}