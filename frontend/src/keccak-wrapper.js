// Wrapper for keccak module to provide default export
// Fix for browser compatibility with CommonJS keccak module
// @ts-ignore
// Import the actual keccak browser build using absolute path to bypass alias
// Vite will transform CommonJS to ESM automatically
import keccakFactory from '../node_modules/keccak/js.js';

// keccak/js.js exports a factory function: module.exports = require('./lib/api')(require('./lib/keccak'))
// In ESM context, this becomes a default export function
// The function accepts algorithm and returns a hash instance

// Create a wrapper that matches the expected interface
function createHash(algorithm = 'keccak256') {
  // keccakFactory is the function returned by lib/api/index.js
  // It accepts (algorithm, options) and returns a hash instance
  return keccakFactory(algorithm);
}

// Export as default for compatibility with relayer-sdk
export default createHash;

// Also export named export
export { createHash };
