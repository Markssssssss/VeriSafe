import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// We'll handle alias exclusion in the resolve.alias config itself
// No need for a separate plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    nodePolyfills({
      // Include polyfills for module and require which keccak needs
      globals: {
        Buffer: true,
        global: true,
        process: true,
        module: true,
        require: true
      }
    })
  ],
  optimizeDeps: {
    // Include relayer-sdk to ensure proper processing
    include: ['@zama-fhe/relayer-sdk/web', 'react', 'react-dom', 'keccak/js.js'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      jsx: 'automatic'
    }
  },
  resolve: {
    alias: [
      {
        find: /^keccak$/,
        replacement: path.resolve(__dirname, 'src/keccak-wrapper.js'),
        customResolver: (id, importer) => {
          // Don't apply alias when importing from wrapper files
          if (importer && (importer.includes('keccak-real.js') || importer.includes('keccak-wrapper.js'))) {
            return null // Let Vite resolve to node_modules
          }
          return path.resolve(__dirname, 'src/keccak-wrapper.js')
        }
      },
      {
        find: 'fetch-retry',
        replacement: path.resolve(__dirname, 'src/fetch-retry-wrapper.js')
      }
    ],
    // Ensure proper resolution of keccak package  
    conditions: ['browser', 'module', 'import', 'default']
  },
  ssr: {
    noExternal: ['keccak', '@zama-fhe/relayer-sdk']
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
      // Don't externalize relayer-sdk - it needs to be bundled
      external: [],
      // Plugin to handle CommonJS modules in relayer-sdk
      plugins: []
    }
  }
})
