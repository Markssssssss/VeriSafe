// Polyfill for 'module' before importing keccak (needed for CommonJS modules in browser)
if (typeof module === 'undefined') {
  // @ts-ignore
  globalThis.module = { exports: {} };
}
if (typeof require === 'undefined') {
  // @ts-ignore
  globalThis.require = function(id) {
    throw new Error('require() is not available in browser. This should be handled by Vite.');
  };
}

// Direct import of real keccak module (not aliased)
// keccak/js.js is a CommonJS module that needs proper handling
// We'll let Vite's CommonJS plugin handle the transformation
// @ts-ignore
// Import using a path that Vite will process through its CommonJS transformer
import keccakModule from '../node_modules/keccak/js.js';

// Vite should automatically transform CommonJS to ESM and provide default export
// Export for use by keccak-wrapper
export default keccakModule;
