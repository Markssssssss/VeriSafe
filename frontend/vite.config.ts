import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    nodePolyfills()
  ],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    include: ['keccak/js.js', 'react', 'react-dom'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      jsx: 'automatic'
    }
  },
  resolve: {
    alias: {
      // Alias keccak to wrapper for imports from other files
      'keccak': path.resolve(__dirname, 'src/keccak-wrapper.js'),
      // Fix for fetch-retry - point to wrapper
      'fetch-retry': path.resolve(__dirname, 'src/fetch-retry-wrapper.js')
    },
    // Ensure proper resolution of keccak package  
    conditions: ['browser', 'module', 'import', 'default']
  },
  ssr: {
    noExternal: ['keccak']
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
    // Ensure assets are referenced correctly
    assetsDir: 'assets',
    // Don't inline assets that are too large
    assetsInlineLimit: 4096,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/fetch-retry/, /react/, /react-dom/, /keccak/, /@zama-fhe\/relayer-sdk/],
      // Enable default interop for CommonJS modules
      defaultIsModuleExports: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'relayer-sdk': ['@zama-fhe/relayer-sdk/web']
        },
        // Ensure consistent asset naming
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      },
      // External handling for relayer-sdk
      external: []
    }
  }
})
