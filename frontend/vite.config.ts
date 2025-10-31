import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }), 
    nodePolyfills()
  ],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    include: ['keccak', 'react', 'react-dom'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      jsx: 'automatic'
    }
  },
  resolve: {
    alias: {
      // Fix for keccak module - use wrapper that handles CommonJS properly
      'keccak': path.resolve(__dirname, 'src/keccak-wrapper.js'),
      // Fix for fetch-retry - point to wrapper
      'fetch-retry': path.resolve(__dirname, 'src/fetch-retry-wrapper.js')
    },
    // Ensure proper resolution of keccak package
    conditions: ['browser', 'module', 'import', 'default']
  },
  define: {
    'global': 'globalThis'
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2022',
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/fetch-retry/, /react/, /react-dom/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'relayer-sdk': ['@zama-fhe/relayer-sdk']
        }
      }
    }
  }
})
