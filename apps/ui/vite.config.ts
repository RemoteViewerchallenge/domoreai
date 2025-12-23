import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
    nodePolyfills({
       // Use defaults but force protocol imports
       protocolImports: true,
    })
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/nebula": path.resolve(__dirname, "../../packages/nebula/src"),
      
      // Force alias Node.js built-ins to the shim
      "perf_hooks": path.resolve(__dirname, "./src/shims.js"),
      "os": path.resolve(__dirname, "./src/shims.js"),
      "path": path.resolve(__dirname, "./src/shims.js"),
      "fs": path.resolve(__dirname, "./src/shims.js"), // shim fs if needed
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
