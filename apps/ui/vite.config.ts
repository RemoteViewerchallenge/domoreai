import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default

// Point to our robust shim
const shimPath = path.resolve(__dirname, "./src/shims.ts");

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
  ],
  define: {
    'process.env': {},
    'process.browser': true,
    'process.platform': '"browser"', // Hardcode platform here too
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/nebula": path.resolve(__dirname, "../../packages/nebula/src"),
      
      // Force all Node modules to the single shim
      "fs": shimPath,
      "node:fs": shimPath,
      "path": shimPath,
      "node:path": shimPath,
      "os": shimPath,
      "node:os": shimPath,
      "util": shimPath,
      "node:util": shimPath,
      "process": shimPath,
      "node:process": shimPath,
      "perf_hooks": shimPath,
      "node:perf_hooks": shimPath,
      "assert": shimPath,
      "events": shimPath,
      "stream": shimPath,
      "buffer": shimPath,
    },
  },
  optimizeDeps: {
    // We MUST exclude 'typescript' so Vite doesn't bundle it and hardcode the 'fs' reference
    // This forces the browser to load it via our aliases at runtime.
    exclude: ['typescript', 'fs', 'os', 'path', 'perf_hooks'], 
    esbuildOptions: {
        // In case it DOES build, treat .ts files as TS
        loader: {
            '.ts': 'ts'
        }
    }
  },
})
