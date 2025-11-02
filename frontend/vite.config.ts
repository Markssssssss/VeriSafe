import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// We'll handle alias exclusion in the resolve.alias config itself
// No need for a separate plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    nodePolyfills({
      // Include polyfills which keccak and relayer-sdk need
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      // Explicitly enable stream polyfills for relayer-sdk
      include: [
        'stream',
        '_stream_readable',
        '_stream_writable',
        '_stream_duplex',
        '_stream_transform',
        '_stream_passthrough'
      ]
    }),
    // Custom plugin to handle WASM file serving from node_modules
    {
      name: 'wasm-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.includes('.wasm')) {
            console.log('[WASM Handler] Request URL:', req.url);
            
            // Extract filename from URL
            const filename = req.url.split('/').pop() || req.url.split('/').slice(-1)[0];
            const wasmPath = req.url.replace(/^\//, '').replace(/^\/@fs\//, ''); // Remove leading slash and @fs prefix
            
            // Common WASM filenames from relayer-sdk (v0.3.0-3)
            const wasmFiles: Record<string, string> = {
              'kms_lib_bg.wasm': 'node_modules/@zama-fhe/relayer-sdk/bundle/kms_lib_bg.wasm',
              'tfhe_bg.wasm': 'node_modules/@zama-fhe/relayer-sdk/bundle/tfhe_bg.wasm',
            };
            
            const possiblePaths = [
              // Try by filename match first
              filename && wasmFiles[filename] ? path.resolve(__dirname, wasmFiles[filename]) : null,
              // Try direct path resolution
              path.resolve(__dirname, wasmPath),
              // Try from node_modules root
              path.resolve(__dirname, 'node_modules', wasmPath),
              // Try from relayer-sdk
              path.resolve(__dirname, 'node_modules/@zama-fhe/relayer-sdk', wasmPath),
              // Try specific known locations (v0.3.0-3 paths)
              path.resolve(__dirname, 'node_modules/@zama-fhe/relayer-sdk/bundle', filename || ''),
              path.resolve(__dirname, 'node_modules/@zama-fhe/relayer-sdk/lib', filename || ''),
              // Try without node_modules prefix (in case path already includes it)
              wasmPath.startsWith('node_modules/') ? path.resolve(__dirname, wasmPath) : null,
            ].filter((p): p is string => p !== null && p !== '');
            
            let found = false;
            for (const possiblePath of possiblePaths) {
              try {
                if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isFile()) {
                  console.log('[WASM Handler] Found WASM file at:', possiblePath);
                  res.setHeader('Content-Type', 'application/wasm');
                  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
                  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET');
                  
                  const fileContent = fs.readFileSync(possiblePath);
                  res.setHeader('Content-Length', fileContent.length.toString());
                  res.end(fileContent);
                  found = true;
                  break;
                }
              } catch (e) {
                // Continue to next path
              }
            }
            
            if (!found) {
              console.warn('[WASM Handler] WASM file not found for URL:', req.url);
              console.warn('[WASM Handler] Tried paths:', possiblePaths);
              // Set headers anyway and let Vite handle it
              res.setHeader('Content-Type', 'application/wasm');
              res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
              next();
            }
          } else {
            next();
          }
        });
      }
    },
    // Copy WASM files to assets directory during build (v0.3.0-3 paths)
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@zama-fhe/relayer-sdk/bundle/kms_lib_bg.wasm',
          dest: 'assets'
        },
        {
          src: 'node_modules/@zama-fhe/relayer-sdk/bundle/tfhe_bg.wasm',
          dest: 'assets'
        }
      ]
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
        customResolver: (_id, importer) => {
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
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    fs: {
      // Allow serving files from node_modules/@zama-fhe for WASM files
      allow: ['..']
    }
  },
  build: {
    target: 'es2022',
    // Ensure assets are referenced correctly
    assetsDir: 'assets',
    // Don't inline assets that are too large - WASM files need special handling
    assetsInlineLimit: 4096,
    // Ensure WASM files are copied correctly
    copyPublicDir: true,
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
        // Ensure consistent asset naming, especially for WASM files
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
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
