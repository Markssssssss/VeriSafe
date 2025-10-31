// Wrapper for keccak module to provide default export
// Import keccak directly - Vite's browser field resolution should use js.js
// @ts-ignore
import keccakModule from 'keccak';

// keccak/js.js is CommonJS and returns a function (the hash creator)
// The module.exports is the function itself that creates hash instances
// We need to extract createHash if it exists, or use the module itself

// In browser, keccak/js.js exports a function that can be called to create hash instances
// relayer-sdk expects: import createHash from 'keccak'
// So we export the module as default
export default keccakModule.default || keccakModule;

// Also export named export for compatibility
export const createHash = keccakModule.default || keccakModule;
