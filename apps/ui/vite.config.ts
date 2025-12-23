import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
    nodePolyfills({
       // include: ['path', 'fs', 'os', 'util', 'events', 'assert'], // Use defaults
       globals: {
         Buffer: true,
         global: true,
         process: true,
       },
       protocolImports: true,
    })
  ],
  define: {
    'process.env': {},
    // 'process.platform': '"browser"', // Handled by polyfills
    // 'process.browser': true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/nebula": path.resolve(__dirname, "../../packages/nebula/src"),
      // Node.js built-ins are handled by vite-plugin-node-polyfills, except perf_hooks
      "perf_hooks": path.resolve(__dirname, "./src/shims.js"),
      // "os": path.resolve(__dirname, "./src/shims.js"),
      // "fs": path.resolve(__dirname, "./src/shims.js"),
      // "path": path.resolve(__dirname, "./src/shims.js")
    },
    dedupe: ['react', 'react-dom'],
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
