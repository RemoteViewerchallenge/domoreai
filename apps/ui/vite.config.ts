import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true
    },
    proxy: {
      '/llm': 'http://localhost:4000',
    }
  },
  build: {
    rollupOptions: {
      external: [
        // Externalize Monaco-VSCode related dependencies
        /monaco-languageclient/,
        /vscode-ws-jsonrpc/,
        /@codingame\/monaco-vscode-api/,
        /@codingame\/monaco-vscode-.*-service-override/,
        // Specific path that was failing
        '@codingame/monaco-vscode-api/vscode/vs/base/browser/cssValue'
      ],
      output: {
        manualChunks: undefined,
      }
    }
  },
})
