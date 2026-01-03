import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

// Define __dirname for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
    // nodePolyfills({
    //    // Use defaults but force protocol imports
    //    protocolImports: true,
    //    exclude: ['fs'],
    // })
  ],
  define: {
    'process.env': {},
    'process.browser': true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/nebula": path.resolve(__dirname, "../../packages/nebula/src"),
      "fs": path.resolve(__dirname, "./src/shims.ts"),
      "node:fs": path.resolve(__dirname, "./src/shims.ts"),
      "path": path.resolve(__dirname, "./src/shims.ts"),
      "node:path": path.resolve(__dirname, "./src/shims.ts"),
      "os": path.resolve(__dirname, "./src/shims.ts"),
      "node:os": path.resolve(__dirname, "./src/shims.ts"),
      "util": path.resolve(__dirname, "./src/shims.ts"),
      "node:util": path.resolve(__dirname, "./src/shims.ts"),
      "process": path.resolve(__dirname, "./src/shims.ts"),
      // Patch TypeScript
      "typescript": path.resolve(__dirname, "./src/vendor/typescript.js"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['typescript', 'fs', 'os', 'path'],
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true
    },
    proxy: {
      '/llm': 'http://localhost:4000',
      '/trpc': 'http://localhost:4000',
      '/language-server': {
        target: 'http://localhost:4000',
        ws: true,
      },
    }
  },
  build: {
    rollupOptions: {
      external: [
        /monaco-languageclient/,
        /vscode-ws-jsonrpc/,
        /@codingame\/monaco-vscode-api/,
        /@codingame\/monaco-vscode-.*-service-override/,
        '@codingame/monaco-vscode-api/vscode/vs/base/browser/cssValue'
      ],
      output: {
        manualChunks: undefined,
      }
    }
  },
})
