import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
// 1. Import the polyfill plugin
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
    // 2. Enable the polyfills. This replaces your manual aliases.
    nodePolyfills({
      include: ['fs', 'os', 'path', 'util', 'process', 'buffer', 'events', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    // 3. Remove the manual process overrides that might conflict
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/nebula": path.resolve(__dirname, "../../packages/nebula/src"),
      
      // 4. REMOVE ALL THESE MANUAL SHIMS
      // The plugin handles "node:fs", "os", "process" etc. automatically.
    },
  },
  optimizeDeps: {
    // You can likely remove 'typescript' from here now, but keeping it excluded 
    // is safer if you want to avoid pre-bundling the entire compiler.
    exclude: ['typescript'], 
    esbuildOptions: {
        loader: {
            '.ts': 'ts'
        }
    }
  },
  build: {
    commonjsOptions: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
      transformMixedEsModules: true,
    },
  },
})
