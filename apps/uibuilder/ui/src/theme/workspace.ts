import { createTheme } from '@mui/material/styles';

/**
 * Workspace Theme: Focuses on neutral, data-driven aesthetics.
 * Uses CSS variables for properties that users will edit via the spreadsheet.
 */
export const workspaceTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a0a', // Deep background for the outer "void"
      paper: '#1e1e1e',   // Default panel background
    },
    primary: {
      main: '#007acc',    // Neutral "Action" blue (VS Code style)
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 13,
  },
  components: {
    // We override Paper because our TilingPanel uses it or Boxes that look like it
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 0, // Hard edges for snapping layouts
          // These variables can be overridden by the TilingPanel props
          backgroundColor: 'var(--panel-bg, #1e1e1e)',
          color: 'var(--panel-text, #efefef)',
          border: '1px solid var(--panel-border, #333)',
        },
      },
    },
    // Styles for the Spreadsheet side
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '4px 8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '11px',
        },
      },
    },
    // Clean, minimal inputs for the Spreadsheet
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '12px',
          fontFamily: 'monospace',
          '& input': {
            padding: '4px 0',
          },
        },
      },
    },
  },
});